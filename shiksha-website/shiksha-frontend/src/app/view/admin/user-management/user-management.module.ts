import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserManagementRoutingModule } from './user-management-routing.module';
import { TranslateModule } from '@ngx-translate/core';
import { AddEditUserComponent } from './add-edit-user/add-edit-user.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonDropdownComponent } from 'src/app/shared/components/common-dropdown/common-dropdown.component';
import { NgToggleModule } from 'ng-toggle-button';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { FormDropdownComponent } from 'src/app/shared/components/form-dropdown/form-dropdown.component';
import { DisablePopupComponent } from 'src/app/shared/components/disable-popup/disable-popup.component';
import { UploadPopupComponent } from 'src/app/shared/components/upload-popup/upload-popup.component';
import { HasPermissionDirective } from 'src/app/core/directives/has-permission.directive';
import { PaginationComponent } from 'src/app/shared/components/pagination/pagination.component';

@NgModule({
  declarations: [
  
    AddEditUserComponent,
    
    
  ],
  imports: [
    CommonModule,
    UserManagementRoutingModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule,
    NgToggleModule,
    FormDropdownComponent,
    DisablePopupComponent,
    CommonDropdownComponent,
    ModalComponent,
    UploadPopupComponent,
    HasPermissionDirective,
    PaginationComponent
  ]
})
export class UserManagementModule { }
