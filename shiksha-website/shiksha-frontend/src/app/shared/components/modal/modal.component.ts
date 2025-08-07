import { Component } from '@angular/core';
import { ModalService } from './modal.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone:true,
  imports:[CommonModule]
})
export class ModalComponent{

  constructor(private modalService: ModalService){}

  closeModal(){
    this.modalService.showDeleteUserDialog = false;
    this.modalService.showRenegenerateDialog = false;
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }

}
