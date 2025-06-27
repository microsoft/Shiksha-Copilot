from datasets import load_dataset
from peft import (
    LoraConfig,
    PeftModel,
    get_peft_model,
)
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForSeq2Seq,
    TrainingArguments,
    Trainer,
)
import torch
import evaluate
import math
import numpy as np
import sys

from dotenv import load_dotenv
import os

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")

use_wandb=False
if use_wandb:
    import wandb

def compute_metrics(eval_pred):
    logits, labels, losses = eval_pred.predictions, eval_pred.label_ids, eval_pred.losses
    loss = losses.mean().item()
    perplexity = math.exp(loss)
    predictions = logits.argmax(-1)
    labels[labels == -100] = tokenizer.pad_token_id
    assert predictions.shape == labels.shape, "Shape of predictions and labels should match, currently {} and {}".format(predictions.shape, labels.shape)

    cleaned_predictions = []
    cleaned_labels = []
    for pred, lbl in zip(predictions, labels):
        inst_end_indices = np.where(lbl == tokenizer.convert_tokens_to_ids("[/INST]"))
        inst_end_ind = inst_end_indices[0][0] if inst_end_indices[0].size > 0 else None
        eos_indices = np.where(lbl == tokenizer.eos_token_id)
        eos_ind = eos_indices[0][0] if eos_indices[0].size > 0 else None
        cleaned_predictions.append(pred[inst_end_ind:eos_ind-1])
        cleaned_labels.append(lbl[inst_end_ind+1:eos_ind])

    cleaned_predictions = tokenizer.batch_decode(cleaned_predictions, skip_special_tokens=True)
    cleaned_labels = tokenizer.batch_decode(cleaned_labels, skip_special_tokens=True)

    bleu_metric = evaluate.load("bleu")
    bleu_score = bleu_metric.compute(predictions=cleaned_predictions, references=cleaned_labels)
    
    out = {
        'loss': loss,
        'perplexity': perplexity,
        'bleu': bleu_score['bleu'] if 'bleu' in bleu_score else 'N/A'
    }
    return out

if len(sys.argv) != 4:
    print("Usage: python ft_nirmit.py <path_to_dataset> <path_to_output> <verion_like_v2.x>")
    sys.exit(1)

path_to_dataset = sys.argv[1]
path_to_output = sys.argv[2]
version = sys.argv[3]

print(f"Argument 1: {path_to_dataset}")
print(f"Argument 2: {path_to_output}")
print(f"Argument 3: {version}")

tokenizer = AutoTokenizer.from_pretrained("sarvamai/sarvam-1")
data_collator = DataCollatorForSeq2Seq(tokenizer=tokenizer)
model = AutoModelForCausalLM.from_pretrained("sarvamai/sarvam-1", device_map=None)

ds = load_dataset("i-was-here/translation-v9", token=HF_TOKEN, data_files = {'train': path_to_dataset, 'test': 'synthTestLabels.json'})# data_files = ['v9.1-data.json'])
# ds = load_dataset('json', data_files = {'train': path_to_dataset, 'test': './synthTestLabels.json'})

print(ds)

# add a chat template to the tokenizer so that it can handle multi-turn conversations
tokenizer.chat_template = "{% if messages[0]['role'] == 'system' %}{% set loop_messages = messages[1:] %}{% set system_message = messages[0]['content'] %}{% else %}{% set loop_messages = messages %}{% set system_message = false %}{% endif %}{% for message in loop_messages %}{% if (message['role'] == 'user') != (loop.index0 % 2 == 0) %}{{ raise_exception('Conversation roles must alternate user/assistant/user/assistant/...') }}{% endif %}{% if loop.index0 == 0 and system_message != false %}{% set content = '<<SYS>>\\n' + system_message + '\\n<</SYS>>\\n\\n' + message['content'] %}{% else %}{% set content = message['content'] %}{% endif %}{% if message['role'] == 'user' %}{{ bos_token + '[INST] ' + content.strip() + ' [/INST]' }}{% elif message['role'] == 'assistant' %}{{ ' '  + content.strip() + ' ' + eos_token }}{% endif %}{% endfor %}"

# the tokenizer does not have a pad token, so let's add it and resize the model embeddings
tokenizer.add_tokens("[PAD]", special_tokens=True)
tokenizer.pad_token = "[PAD]"
model.resize_token_embeddings(len(tokenizer))

# model.gradient_checkpointing_enable()

# let us use the parameter-efficient finetuning method LoRA
# using this config, we will only train 100M parameters (~3% of the total parameters)
config = LoraConfig(
    r=256, lora_alpha=512, lora_dropout=0.1, target_modules=["lm_head", "k_proj", "q_proj", "v_proj", "o_proj", "gate_proj", "down_proj", "up_proj"]
)

# From Adapter model
if False:
    # to continue for a previously trained adapter
    adapter_model = "<adapter-path>"
    model = PeftModel.from_pretrained(model, adapter_model, is_trainable=True)
else:
    model = get_peft_model(model, config)
model.print_trainable_parameters()

# let us preprocess the dataset
def preprocess_function(example):
  model_inputs = tokenizer.apply_chat_template(example["messages"], tokenize=False)
  tokenized_inputs = tokenizer(model_inputs)
  tokenized_inputs["labels"] = tokenized_inputs["input_ids"].copy()
  return tokenized_inputs

ds = ds.map(preprocess_function, remove_columns=ds["train"].column_names)

if use_wandb:
    # Initialize wandb
    wandb.init(project="translation", name=version, group=version)

# train the model
training_args = TrainingArguments(
    output_dir=path_to_output,
    save_steps=1000,
    num_train_epochs=20,
    # save_total_limit=21,
    per_device_train_batch_size=10,
    warmup_steps=1000,
    weight_decay=0.0001,
    bf16=True,
    logging_steps=20,
    learning_rate=0.00001,
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={"use_reentrant": False},
    eval_on_start=True,
    logging_dir=path_to_output+"/training_logs",
    do_eval=True,
    per_device_eval_batch_size=10,
    eval_strategy="steps",
    eval_steps=500,
    batch_eval_metrics=False,
    label_names=["labels"],
    include_for_metrics=["loss", "inputs"],
    report_to="wandb" if use_wandb else "none",
    run_name=version,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=ds["train"],
    data_collator=data_collator,
    eval_dataset=ds["test"],
    compute_metrics=compute_metrics,
)
trainer.train()
# metrics = trainer.evaluate() 