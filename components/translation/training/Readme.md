# Training Script Readme

This readme provides instructions on how to use the training script for the translation model.

## Prerequisites

- Python 3.9 or higher
- Required Python packages (listed in `req.txt`)

## Data Format

The training script requires the data to be in SFT (Structured Fine-Tuning) format. Ensure your dataset is properly formatted before running the script.
Example:
```json
[
    {
        "messages": [
            {
                "role": "user",
                "content": "Translate from English to Kannada: Chlorophyll causes green color in the leaves."
            },
            {
                "role": "assistant",
                "content": "ಎಲೆಗಳಲ್ಲಿ ಹಸಿರು ಬಣ್ಣಕ್ಕೆ ಕ್ಲೋರೊಫಿಲ್ ಕಾರಣವಾಗಿದೆ."
            }
        ]
    },
    // Other examples...
]
```

## Usage

To run the training script, use the following command:

```bash
python ft.py <path_to_dataset> <path_to_output> <verion_like_v2.x>;
```

## Parameters

You can specify various training parameters in the `TrainingArguments` section of the script. Some of the key parameters include:

- `batch_size`: The number of samples per batch.
- `total_epochs`: The total number of epochs for training.

Example:

```python
from transformers import TrainingArguments

training_args = TrainingArguments(
    output_dir='./results',          # output directory
    num_train_epochs=3,              # total number of training epochs
    per_device_train_batch_size=8,   # batch size for training
    per_device_eval_batch_size=8,    # batch size for evaluation
    warmup_steps=500,                # number of warmup steps for learning rate scheduler
    weight_decay=0.01,               # strength of weight decay
    logging_dir='./logs',            # directory for storing logs
)
```