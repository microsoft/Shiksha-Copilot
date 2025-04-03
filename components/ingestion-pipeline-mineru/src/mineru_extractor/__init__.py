import os
from magic_pdf.data.data_reader_writer import FileBasedDataWriter, FileBasedDataReader
from magic_pdf.data.dataset import PymuDocDataset
from magic_pdf.model.doc_analyze_by_custom_model import doc_analyze

from ingestion_pipeline.base.text_extractor import TextExtractor

class MinerUTextExtractor(TextExtractor):
    def extract_text(self, file_path: str, **kwargs) -> str:
        """
        Extracts text from a PDF file by applying the magic-pdf inference pipeline.

        Keyword Args:
            ocr (bool): Whether to use OCR mode. Default is True.
            image_dir (str): Directory for storing images. Default is "mineru-output/images".

        Returns:
            str: The Markdown string extracted from the PDF.
        """
        # Get options from kwargs with defaults
        ocr = kwargs.get("ocr", True)
        local_image_dir = kwargs.get("image_dir", "mineru-output/images")

        # Ensure the output directories exist
        os.makedirs(local_image_dir, exist_ok=True)

        # Create file writers/readers
        image_writer = FileBasedDataWriter(local_image_dir)
        reader = FileBasedDataReader("")

        # Read PDF content as bytes
        pdf_bytes = reader.read(file_path)

        # Create the dataset instance from the PDF bytes
        ds = PymuDocDataset(pdf_bytes)

        # Run inference with the chosen mode (OCR or text-based)
        if ocr:
            infer_result = ds.apply(doc_analyze, ocr=True)
            # Use the OCR pipeline to process images, etc.
            pipe_result = infer_result.pipe_ocr_mode(image_writer)
        else:
            infer_result = ds.apply(doc_analyze, ocr=False)
            # Use the text pipeline instead of OCR
            pipe_result = infer_result.pipe_txt_mode(image_writer)

        # The get_markdown function expects a string (usually the basename of the image directory)
        image_dir_basename = os.path.basename(local_image_dir)
        md_content = pipe_result.get_markdown(image_dir_basename)

        # Optionally, if you want to dump files for debugging:
        # pipe_result.dump_md(md_writer, f"{os.path.splitext(os.path.basename(file_path))[0]}.md", image_dir_basename)
        # pipe_result.dump_content_list(md_writer, f"{os.path.splitext(os.path.basename(file_path))[0])}_content_list.json", image_dir_basename)
        # pipe_result.dump_middle_json(md_writer, f"{os.path.splitext(os.path.basename(file_path))[0])}_middle.json")

        return md_content

# import os

# from magic_pdf.data.data_reader_writer import FileBasedDataWriter, FileBasedDataReader
# from magic_pdf.data.dataset import PymuDocDataset
# from magic_pdf.model.doc_analyze_by_custom_model import doc_analyze
# from magic_pdf.config.enums import SupportedPdfParseMethod

# # args
# pdf_file_name = "/home/kchourasia/ShikshaOSS/Shiksha-Copilot/components/ingestion-pipeline/tests/files/english-one-column-social.pdf"  # replace with the real pdf path
# name_without_suff = os.path.splitext(os.path.basename(pdf_file_name))[0]

# # prepare env
# local_image_dir, local_md_dir = "output/images", "output"
# image_dir = str(os.path.basename(local_image_dir))

# os.makedirs(local_image_dir, exist_ok=True)

# image_writer, md_writer = FileBasedDataWriter(local_image_dir), FileBasedDataWriter(
#     local_md_dir
# )

# # read bytes
# reader1 = FileBasedDataReader("")
# pdf_bytes = reader1.read(pdf_file_name)  # read the pdf content

# # proc
# ## Create Dataset Instance
# ds = PymuDocDataset(pdf_bytes)

# ## inference
# # if ds.classify() == SupportedPdfParseMethod.OCR:
# print("INFERING WITH OCR")
# infer_result = ds.apply(doc_analyze, ocr=True)

# ## pipeline
# pipe_result = infer_result.pipe_ocr_mode(image_writer)

# # else:
# #     print("INFERING WITHOUT OCR")
# #     infer_result = ds.apply(doc_analyze, ocr=False)

# #     ## pipeline
# #     pipe_result = infer_result.pipe_txt_mode(image_writer)

# ### draw model result on each page
# infer_result.draw_model(os.path.join(local_md_dir, f"{name_without_suff}_model.pdf"))

# ### get model inference result
# model_inference_result = infer_result.get_infer_res()

# ### draw layout result on each page
# pipe_result.draw_layout(os.path.join(local_md_dir, f"{name_without_suff}_layout.pdf"))

# ### draw spans result on each page
# pipe_result.draw_span(os.path.join(local_md_dir, f"{name_without_suff}_spans.pdf"))

# ### get markdown content
# md_content = pipe_result.get_markdown(image_dir)

# print(md_content)

# ### dump markdown
# pipe_result.dump_md(md_writer, f"{name_without_suff}.md", image_dir)

# ### get content list content
# content_list_content = pipe_result.get_content_list(image_dir)

# ### dump content list
# pipe_result.dump_content_list(md_writer, f"{name_without_suff}_content_list.json", image_dir)

# ### get middle json
# middle_json_content = pipe_result.get_middle_json()

# ### dump middle json
# pipe_result.dump_middle_json(md_writer, f'{name_without_suff}_middle.json')