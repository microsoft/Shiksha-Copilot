import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export interface DeleteDetailConfig {
  heading: string;
  confirmationText: string;
  primaryButtonLabel: string;
  primaryButtonType: string;
  cancelButtonLabel?:string;
  idleTime?:number
}

@Component({
  selector: 'app-delete-detail',
  standalone:true,
  imports:[TranslateModule, CommonModule],
  templateUrl: './delete-detail.component.html',
  styleUrls: ['./delete-detail.component.scss']
})
export class DeleteDetailComponent {
  @Output() close = new EventEmitter<string>();

  @Input() config!: DeleteDetailConfig;

  @Input() showCancelBtn = true;

  closePopUp(val?:any) {
    this.close.emit(val);
  }

  onPrimaryAction() {
    this.close.emit(this.config.primaryButtonType);
  }
}
