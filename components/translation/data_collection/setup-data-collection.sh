#!/bin/bash

sudo apt update
pip install -r requirements.txt
sudo apt install poppler-utils
sudo apt install tesseract-ocr
wget -P /usr/share/tesseract-ocr/4.00/tessdata https://github.com/tesseract-ocr/tessdata/raw/refs/heads/main/kan.traineddata
