import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../modal/modal.service';

@Component({
  selector: 'app-upload-error-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-error-popup.component.html',
  styleUrls: ['./upload-error-popup.component.scss'],
})
export class UploadErrorPopupComponent {
  @Input() modalHeader!: string;

  @Input() errorUrl!: string;

  constructor(private modalService: ModalService) {}

  /**
   * Function to close popup
   */
  closeModal() {
    this.modalService.showUploadErrorDialog = false;
  }
}
