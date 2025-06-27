# Data Collection for English-Kannada Translation

This directory contains scripts to collect English-Kannada translation data by scraping NCERT textbooks. The data collected is mainly of 2 kinds:

## Textbook Data
The textbook data collection process is divided into four steps, each handled by a separate script.

### Step 1: Initial Data Extraction
**Script:** `pdf2img.py`

*Description:*
The `pdf2img.py` script is responsible for extracting images from PDF files. It processes each page of the PDF and saves them as individual image files. It requires the path to the PDF file as input and outputs images for each page.

### Step 2: Text extraction from images
**Scripts:** `ocr_based_on_toc.py`

*Description:*
The `ocr_based_on_toc.py` script performs Optical Character Recognition (OCR) on the images extracted in Step 1. It uses the Table of Contents (ToC) to identify and extract text from each page, saving the results in a structured format where the text is stored separately for each chapter.
The `toc` can be generated using the `gpt4v.py` script. It will take in the page number for the toc(path of image which has toc) and will convert it into a json.

### Step 3: English-Kannada Sentence Matching
**Script:** `extract_sentence_pairs.py`

*Description:*
The `extract_sentence_pairs.py` script takes the path of both english text and kannada text for the same chapter, as extracted by last step. It will then provide one kannada sentence and a few english sentences, asking ChatGPT it to find the best matching english sentence. This yields english-kannada sentence pairs.

### Step 4: Final Data Cleaning
**Script:** `cleanup_sentence_pairs.py`

*Description:*
The `cleanup_sentence_pairs.py` script processes the output from Step 3 to remove any unwanted characters, clean the numbers in kannada, clean the parantheses(mainly maths sentences) in english and kannada text together. This step is crucial for maintaining the quality and integrity of the dataset.
There are extra filters for sentences coming from math textbooks, which are present in `extraFilter-maths.py`. Maths might require extra cleaning because of the presence of equations and other symbols, making it difficult for the above steps to always scrape clean outputs.


## Synthetic Data
**Script:** `genSynthData.py`

*Description:*
The `genSynthData.py` script is designed to generate synthetic data for English-Kannada translation. It takes an Excel file containing a glossary of English and Kannada terms as input. The script uses ChatGPT to create sentences in both English and Kannada that convey the same meaning, thereby expanding the dataset with high-quality synthetic translation pairs.