import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../modal/modal.service';
import { UtilityService } from 'src/app/core/services/utility.service';

@Component({
  selector: 'app-disable-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disable-popup.component.html',
  styleUrls: ['./disable-popup.component.scss']
})
export class DisablePopupComponent implements OnInit {

  @Input() modalHeader!:string;

  @Input() modalSubHeader!:string;

  @Input() tableData:any;

  @Input() users_of_school: any;

  @Output() sendDetails = new EventEmitter<void>();


  /**
   * Class constructor
   * @param modalService ModalService
   */
  constructor(private modalService: ModalService, public toast:UtilityService){}
  ngOnInit(): void {
    console.log('tabledata frm disable popup',this.tableData);
    
  }

  /**
   * Function to close popup
   */
  closeModal(){  
    this.modalService.showDeleteUserDialog=false;
  }

  /**
   * Function to disable user
   */
  disableUser(){    
    this.sendDetails.emit(this.tableData);

    this.modalService.showDeleteUserDialog = false;
  }

}
