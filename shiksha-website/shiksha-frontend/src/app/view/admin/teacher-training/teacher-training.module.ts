import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherTrainingRoutingModule } from './teacher-training-routing.module';
import { CreateBatchComponent } from './create-batch/create-batch.component';
import { ViewBatchComponent } from './view-batch/view-batch.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ViewAssignedTeachersComponent } from './view-assigned-teachers/view-assigned-teachers.component';
import { CommonDropdownComponent } from 'src/app/shared/components/common-dropdown/common-dropdown.component';
import { PaginationComponent } from 'src/app/shared/components/pagination/pagination.component';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    CreateBatchComponent,
    ViewBatchComponent,
    ViewAssignedTeachersComponent
  ],
  imports: [
    CommonModule,
    TeacherTrainingRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    CommonDropdownComponent,
    PaginationComponent,
    HttpClientModule
  ]
})
export class TeacherTrainingModule { } 