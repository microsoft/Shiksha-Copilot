import os
import glob
from pdf2image import convert_from_path

def convert_pdfs_to_images(pdf_files, output_folder):
    
    for pdf_file in pdf_files:
        print(pdf_file)
        # Get the name of the PDF file without the extension
        pdf_name = os.path.splitext(os.path.basename(pdf_file))[0]
        
        # Create a subdirectory in the output folder with the name of the PDF
        pdf_output_folder = os.path.join(output_folder, pdf_name, "images")
        os.makedirs(pdf_output_folder, exist_ok=True)
        
        # Convert PDF to images
        images = convert_from_path(pdf_file, dpi=300)  # Set DPI for high quality
        
        # Save images in the relevant subdir
        for page_number, image in enumerate(images):
            image.save(os.path.join(pdf_output_folder, f'{page_number}.jpg'), 'JPEG')
        
        print(f'Converted {pdf_name}.pdf to images in {pdf_output_folder}')

if __name__ == "__main__":
    grade = 10
    input_path = f"/home/t-narora/translation/scraped_books/KSEEB_kan/english/{grade}"
    output_path = f"/home/t-narora/translation/scraped_books/KSEEB_kan/english/{grade}"
    
    pdf_files = glob.glob(os.path.join(input_path, '*.pdf'))
    
    convert_pdfs_to_images(pdf_files, output_path)
