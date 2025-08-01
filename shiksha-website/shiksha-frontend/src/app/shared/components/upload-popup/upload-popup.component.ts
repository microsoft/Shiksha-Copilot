import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxFileDropEntry, NgxFileDropModule } from 'ngx-file-drop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UtilityService } from 'src/app/core/services/utility.service';
import { ModalService } from '../modal/modal.service';
import { MAX_FILE_SIZE } from '../../utility/constant.util';
import { ExcelDownloadService } from '../../services/excel_download.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-upload-popup',
  standalone: true,
  imports: [CommonModule, NgxFileDropModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './upload-popup.component.html',
  styleUrls: ['./upload-popup.component.scss'],
})
export class UploadPopupComponent implements OnInit{
  public files: NgxFileDropEntry[] = [];

  @Input() allowedFileTypes: string[] = [];

  @Input() multiUpload: boolean = false;

  @Output() fileUploaded: EventEmitter<any> = new EventEmitter();

  @Output() upload: EventEmitter<any> = new EventEmitter();

  @Input() context!:string | undefined;

  /**
   * Class constructor
   * @param utilityService UtilityService
   * @param modalService ModalService
   */
  constructor(
    private utilityService: UtilityService,
    private modalService: ModalService,
    private excelDownloadService: ExcelDownloadService
  ) {}

  /**
   * Getter function to get file types
   */
  get acceptFileTypes() {
    return this.allowedFileTypes.join(', ');
  }

  /**
   * Function triggered on upload
   * @param files 
   */
  public dropped(files: NgxFileDropEntry[]) {
    this.files = files;
    for (const droppedFile of files) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          const fileType = `.${file.name.split('.').pop()}`;
          if (!this.allowedFileTypes.includes(fileType)) {
            this.utilityService.showWarning(
              `Unsupported file type. Please upload a file with the following extensions: ${this.allowedFileTypes.join(
                ', '
              )}`
            );
            this.files =[]
            return;
          }

          if (file.size > MAX_FILE_SIZE) {
            this.utilityService.showWarning(
              `File size exceeds the maximum limit of 5MB.`
            );
            this.files =[]
            return;
          }

          const fileDetails = {
            path: droppedFile.relativePath,
            file,
          };
          this.fileUploaded.emit(fileDetails);
        });
      }
    }
  }

  /**
   * Function to delete uploaded file
   * @param i index
   */
  deleteFile(i: any) {
    this.files.splice(i, 1);
    this.fileUploaded.emit(this.files);
  }

  /**
   * Function to close the popup
   */
  closeModal() {
    this.modalService.showBlukUploadDialog = false;
  }

  /**
   * Function triggered on upload
   */
  uploadFile() {
    this.upload.emit(true);
  }

  // Function to handle user template download
  downloadTemplate() {
    if(this.context === 'user-management'){
      this.excelDownloadService.downloadTemplate('teacher');
    }
    else if(this.context === 'school-management'){
      this.excelDownloadService.downloadTemplate('school');
    }
  }

  
  ngOnInit(): void {
    console.log('contxt', this.context);
    
  }
}
