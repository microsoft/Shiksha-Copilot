import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../modal/modal.service';

@Component({
  selector: 'app-instructions-popup',
  templateUrl: './instructions-popup.component.html',
  styleUrls:['./instructions-popup.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ],
})
export class InstructionsPopupComponent {
  @Output() showInstructions: EventEmitter<boolean> =
    new EventEmitter<boolean>();

  @Input() instructions!:any[];
  constructor(private modalServcie:ModalService){}

  @Input() isChatbot=false;

  closeModal() {
    this.showInstructions.emit(false);
    if(this.isChatbot){
      this.modalServcie.showChatbotSampleDialog = false
    }
  }
}
