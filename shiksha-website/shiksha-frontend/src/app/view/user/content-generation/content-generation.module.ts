import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ContentGenerationRoutingModule } from './content-generation-routing.module';
import { LessonContentListComponent } from './lesson-content-list/lesson-content-list.component';
import { CommonDropdownComponent } from 'src/app/shared/components/common-dropdown/common-dropdown.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormDropdownComponent } from 'src/app/shared/components/form-dropdown/form-dropdown.component';
import { ChooseLessonPlanComponent } from './choose-lesson-plan/choose-lesson-plan.component';
import { AccordionComponent } from 'src/app/shared/components/accordion/accordion.component';
import { InspectLessonPlanComponent } from './inspect-lesson-plan/inspect-lesson-plan.component';
import { InspectLessonResourcesComponent } from './inspect-lesson-resources/inspect-lesson-resources.component';
import { RegeneratePopupComponent } from 'src/app/shared/components/regenerate-popup/regenerate-popup.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormatContentPipe } from './format-content.pipe';
import { HasPermissionDirective } from 'src/app/core/directives/has-permission.directive';
import { PaginationComponent } from 'src/app/shared/components/pagination/pagination.component';
import { DeleteDetailComponent } from 'src/app/shared/components/delete-detail/delete-detail.component';


@NgModule({
  declarations: [
    LessonContentListComponent,
    ChooseLessonPlanComponent,
    InspectLessonPlanComponent,
    InspectLessonResourcesComponent,
    FormatContentPipe,
  ],
  imports: [
    CommonModule,
    ContentGenerationRoutingModule,
    CommonDropdownComponent,
    FormsModule,
    ReactiveFormsModule,
    FormDropdownComponent,
    AccordionComponent,
    RegeneratePopupComponent,
    ModalComponent,
    TranslateModule,
    HasPermissionDirective,
    PaginationComponent,
    DeleteDetailComponent
    
  ],
  exports:[
    FormatContentPipe
  ]
})
export class ContentGenerationModule { }
