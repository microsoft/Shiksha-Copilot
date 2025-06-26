import logging
import os
import json
import importlib
from dataclasses import dataclass
from enum import Enum, auto
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Type, Union, Callable

logger = logging.getLogger(__name__)


class StepStatus(Enum):
    """Status of a pipeline step execution."""

    PENDING = auto()
    IN_PROGRESS = auto()
    COMPLETED = auto()
    SKIPPED = auto()
    FAILED = auto()


@dataclass
class StepResult:
    """Result of a pipeline step execution."""

    status: StepStatus
    output_paths: Dict[str, str] = None  # Maps output type to file path
    error: Optional[Exception] = None
    metadata: Dict[str, Any] = None


class BasePipelineStep:
    """Base class for all pipeline steps."""

    # Class variables for step identification and dependencies
    name: str = "base_step"
    description: str = "Base step implementation"
    input_types: Set[str] = set()
    output_types: Set[str] = set()

    def __init__(self, config: Dict[str, Any] = None):
        """Initialize the step with configuration parameters."""
        self.config = config or {}

    def validate_inputs(self, input_paths: Dict[str, str]) -> bool:
        """Validate that all required inputs are available."""
        return all(input_type in input_paths for input_type in self.input_types)

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the inputs and generate outputs.

        Args:
            input_paths: Dictionary mapping input types to file paths
            output_dir: Directory where output files should be saved

        Returns:
            StepResult with status and output paths
        """
        raise NotImplementedError("Subclasses must implement process()")


class PipelineRegistry:
    """Registry of available pipeline steps."""

    def __init__(self):
        self.steps: Dict[str, Type[BasePipelineStep]] = {}

    def register_step(self, step_class: Type[BasePipelineStep]):
        """Register a step class."""
        self.steps[step_class.name] = step_class
        return step_class  # Enable use as a decorator

    def get_step(self, name: str) -> Type[BasePipelineStep]:
        """Get a step class by name."""
        if name not in self.steps:
            raise ValueError(f"Step '{name}' not registered")
        return self.steps[name]

    def list_steps(self) -> List[str]:
        """List all registered step names."""
        return list(self.steps.keys())


class PipelineState:
    """State of a pipeline execution."""

    def __init__(self, workdir: str):
        self.workdir = Path(workdir)
        self.current_step: int = 0
        self.results: Dict[str, StepResult] = {}
        self.input_paths: Dict[str, str] = {}
        self.state_file = self.workdir / "pipeline_state.json"

        # Create workdir if it doesn't exist
        self.workdir.mkdir(parents=True, exist_ok=True)

    def save(self):
        """Save the pipeline state to a file."""
        state_dict = {
            "current_step": self.current_step,
            "results": {
                step: {
                    "status": result.status.name,
                    "output_paths": result.output_paths,
                    "metadata": result.metadata,
                    "error": str(result.error) if result.error else None,
                }
                for step, result in self.results.items()
            },
            "input_paths": self.input_paths,
        }

        with open(self.state_file, "w") as f:
            json.dump(state_dict, f, indent=2)

    def load(self) -> bool:
        """Load the pipeline state from a file. Returns True if successful."""
        if not self.state_file.exists():
            return False

        try:
            with open(self.state_file, "r") as f:
                state_dict = json.load(f)

            self.current_step = state_dict["current_step"]
            self.input_paths = state_dict["input_paths"]

            self.results = {}
            for step, result_dict in state_dict["results"].items():
                self.results[step] = StepResult(
                    status=StepStatus[result_dict["status"]],
                    output_paths=result_dict["output_paths"],
                    metadata=result_dict["metadata"],
                    error=(
                        Exception(result_dict["error"])
                        if result_dict["error"]
                        else None
                    ),
                )

            return True

        except Exception as e:
            logger.error(f"Error loading pipeline state: {e}")
            return False


class Pipeline:
    """Pipeline executor that runs a sequence of steps."""

    def __init__(
        self,
        config: Dict[str, Any],
        registry: PipelineRegistry,
        workdir: str,
        initial_inputs: Dict[str, str] = None,
    ):
        """
        Initialize the pipeline.

        Args:
            config: Pipeline configuration
            registry: Step registry
            workdir: Working directory for outputs
            initial_inputs: Initial input file paths
        """
        self.config = config
        self.registry = registry
        self.state = PipelineState(workdir)

        # Load state or initialize with initial inputs
        if not self.state.load() and initial_inputs:
            self.state.input_paths = initial_inputs

    def get_step_output_dir(self, step_name: str) -> str:
        """Get the output directory for a step."""
        step_dir = self.state.workdir / step_name
        step_dir.mkdir(exist_ok=True)
        return str(step_dir)

    def run_from_step(
        self, start_step_idx: Optional[int] = None
    ) -> Dict[str, StepResult]:
        """
        Run the pipeline from a specific step.

        Args:
            start_step_idx: Step index to start from (0-based),
                           or None to start from the current step

        Returns:
            Dictionary mapping step names to their results
        """
        steps_config = self.config.get("steps", [])

        if start_step_idx is not None:
            if start_step_idx < 0 or start_step_idx >= len(steps_config):
                raise ValueError(f"Invalid start step index: {start_step_idx}")
            self.state.current_step = start_step_idx

        for step_idx in range(self.state.current_step, len(steps_config)):
            self.state.current_step = step_idx
            step_config = steps_config[step_idx]

            # Extract step info
            step_name = step_config["name"]
            step_enabled = step_config.get("enabled", True)

            # Skip disabled steps
            if not step_enabled:
                logger.info(f"Skipping disabled step: {step_name}")
                self.state.results[step_name] = StepResult(status=StepStatus.SKIPPED)
                self.state.save()
                continue

            # Get step class and create instance
            try:
                step_class = self.registry.get_step(step_name)
                step = step_class(config=self.config)

                # Check for required inputs
                if not step.validate_inputs(self.state.input_paths):
                    logger.error(f"Missing required inputs for step: {step_name}")
                    self.state.results[step_name] = StepResult(
                        status=StepStatus.FAILED,
                        error=ValueError(
                            f"Missing required inputs for step: {step_name}"
                        ),
                    )
                    self.state.save()
                    break

                # Run step
                logger.info(f"Running step: {step_name}")
                step_output_dir = self.get_step_output_dir(step_name)
                result = step.process(self.state.input_paths, step_output_dir)

                # Update state
                self.state.results[step_name] = result

                # If successful, add outputs to available inputs
                if result.status == StepStatus.COMPLETED and result.output_paths:
                    self.state.input_paths.update(result.output_paths)

            except Exception as e:
                logger.exception(f"Error in step {step_name}: {e}")
                self.state.results[step_name] = StepResult(
                    status=StepStatus.FAILED, error=e
                )

            # Save state after each step
            self.state.save()

            # Stop if step failed
            if self.state.results[step_name].status == StepStatus.FAILED:
                break

        return self.state.results
