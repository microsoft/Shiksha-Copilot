import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { ScheduleRoutingModule } from './schedule-routing.module';
import { AddEditScheduleComponent } from './add-edit-schedule/add-edit-schedule.component';
import { ScheduleViewComponent } from './schedule-view/schedule-view.component';
import { FormDropdownComponent } from 'src/app/shared/components/form-dropdown/form-dropdown.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { TranslateModule } from '@ngx-translate/core';
import { DeleteDetailComponent } from '../../../shared/components/delete-detail/delete-detail.component';

@NgModule({
  declarations: [
    AddEditScheduleComponent,
    ScheduleViewComponent
  ],
  imports: [
    CommonModule,
    ScheduleRoutingModule,
    FormDropdownComponent,
    ReactiveFormsModule,
    DeleteDetailComponent,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory
    }),
    TranslateModule
  ],
  providers: [
    DatePipe
  ]
})
export class ScheduleModule { }
