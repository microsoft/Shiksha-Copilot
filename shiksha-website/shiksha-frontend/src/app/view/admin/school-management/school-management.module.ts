import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SchoolManagementRoutingModule } from './school-management-routing.module';
import { SchoolListComponent } from './school-list/school-list.component';
import { SchoolAddEditComponent } from './school-add-edit/school-add-edit.component';
import { CommonDropdownComponent } from 'src/app/shared/components/common-dropdown/common-dropdown.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormDropdownComponent } from 'src/app/shared/components/form-dropdown/form-dropdown.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { DisablePopupComponent } from 'src/app/shared/components/disable-popup/disable-popup.component';
import { UploadPopupComponent } from 'src/app/shared/components/upload-popup/upload-popup.component';
import { HasPermissionDirective } from 'src/app/core/directives/has-permission.directive';
import { PaginationComponent } from 'src/app/shared/components/pagination/pagination.component';
import { TranslateModule } from '@ngx-translate/core';
import { UploadErrorPopupComponent } from 'src/app/shared/components/upload-error-popup/upload-error-popup.component';
import { DeleteDetailComponent } from 'src/app/shared/components/delete-detail/delete-detail.component';

@NgModule({
  declarations: [
    SchoolListComponent,
    SchoolAddEditComponent,
  ],
  imports: [
    CommonModule,
    SchoolManagementRoutingModule,
    CommonDropdownComponent,
    FormsModule,
    ReactiveFormsModule,
    FormDropdownComponent,
    ModalComponent,
    DisablePopupComponent,
    UploadPopupComponent,
    HasPermissionDirective,
    PaginationComponent,
    TranslateModule,
    UploadErrorPopupComponent,
    DeleteDetailComponent
  ],
  providers:[DatePipe]
})
export class SchoolManagementModule { }
