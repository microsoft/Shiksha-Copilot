import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ShikshanUserManagementRoutingModule } from './shikshan-user-management-routing.module';
import { FormDropdownComponent } from 'src/app/shared/components/form-dropdown/form-dropdown.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { DisablePopupComponent } from 'src/app/shared/components/disable-popup/disable-popup.component';
import { CommonDropdownComponent } from 'src/app/shared/components/common-dropdown/common-dropdown.component';
import { ShikshanUserManageComponent } from './shikshan-user-manage/shikshan-user-manage.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgToggleModule } from 'ng-toggle-button';
import { UploadPopupComponent } from 'src/app/shared/components/upload-popup/upload-popup.component';
import { TranslateModule } from '@ngx-translate/core';
import { PaginationComponent } from 'src/app/shared/components/pagination/pagination.component';


@NgModule({
  declarations: [ 
    ShikshanUserManageComponent,

  ],
  imports: [
    CommonModule,
    ModalComponent,
    ShikshanUserManagementRoutingModule,
    CommonDropdownComponent,
    DisablePopupComponent,
    FormDropdownComponent,
    FormsModule,
    ReactiveFormsModule,
    NgToggleModule,
    TranslateModule,
    UploadPopupComponent,
    PaginationComponent
  ],
})
export class ShikshanUserManagementModule { }
