# Inference Script

This README provides instructions on how to use the inference script in this directory. The script allows you to perform inference on a set of files using a trained LoRA model.

## Requirements

- Python >=3.9
- Required Python packages (listed in `requirements.txt`)
- We recommend using a GPU, which should have at least 20 GBs of RAM. Nvidia's A10 or anything better will work for this model.

## Usage

To run the inference script, you need to provide the following:

1. **Regex of files**: A regular expression to specify the files on which inference is to be performed. You can pass it as a command-line argument.
2. **Path to the LoRA model**: The path to the LoRA model trained in the `training` section.

### Command

```bash
python inference.py <files_regex> <LoRA_path> <source_language> <target_language>;
```

### Example

```bash
python inference.py "./evs-infs-v7.6-evaluate/*_.json" "evs-7.6/checkpoint-8760/" "English" "Kannada";
```

## Sample Input

A sample inference input file is provided in the same directory named `sample_inf_input.json`. This file contains an example of the input format expected by the inference script. You can change the keys as per your usecase. The model will only translate the values whose keys are mentioned in the `resources` variable in the inference script(`inference.py`).
