import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { FormsModule } from '@angular/forms';
import { CommonDropdownComponent } from 'src/app/shared/components/common-dropdown/common-dropdown.component';
import { ContentActivityComponent } from './content-activity/content-activity.component';
import { PaginationComponent } from 'src/app/shared/components/pagination/pagination.component';
import { ViewLessonPlanComponent } from './view-lesson-plan/view-lesson-plan.component';
import { ContentGenerationModule } from '../user/content-generation/content-generation.module';

@NgModule({
  declarations: [
    ContentActivityComponent,
    ViewLessonPlanComponent,
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    FormsModule,
    CommonDropdownComponent,
    PaginationComponent,
    ContentGenerationModule
  ]
})
export class AdminModule { }
