import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserRoutingModule } from './user-routing.module';
import { ProfileComponent } from './profile/profile.component';
import { CommonDropdownComponent } from 'src/app/shared/components/common-dropdown/common-dropdown.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormDropdownComponent } from 'src/app/shared/components/form-dropdown/form-dropdown.component';
import { LanguageSwitcherComponent } from 'src/app/shared/components/language-switcher/language-switcher.component';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { NgChartsModule } from 'ng2-charts';
import { DeleteDetailComponent } from 'src/app/shared/components/delete-detail/delete-detail.component';
import { ProfileImageComponent } from 'src/app/shared/components/profile-image/profile-image.component';


@NgModule({
  declarations: [
    ProfileComponent,
    DashboardComponent,
  ],
  imports: [
    CommonModule,
    UserRoutingModule,
    CommonDropdownComponent,
    ReactiveFormsModule,
    FormsModule,
    FormDropdownComponent,
    LanguageSwitcherComponent,
    TranslateModule,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory
    }),
    NgChartsModule,
    DeleteDetailComponent,
    ProfileImageComponent,
  ]
})
export class UserModule { }
