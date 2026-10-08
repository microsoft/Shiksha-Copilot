import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ContentGenerationRoutingModule } from './content-generation-routing.module';
import { LessonContentListComponent } from './lesson-content-list/lesson-content-list.component';
import { CommonDropdownComponent } from 'src/app/shared/components/common-dropdown/common-dropdown.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormDropdownComponent } from 'src/app/shared/components/form-dropdown/form-dropdown.component';
import { AccordionComponent } from 'src/app/shared/components/accordion/accordion.component';
import { RegeneratePopupComponent } from 'src/app/shared/components/regenerate-popup/regenerate-popup.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormatContentPipe } from './format-content.pipe';
import { HasPermissionDirective } from 'src/app/core/directives/has-permission.directive';
import { PaginationComponent } from 'src/app/shared/components/pagination/pagination.component';
import { DeleteDetailComponent } from 'src/app/shared/components/delete-detail/delete-detail.component';
import { LessonPlanViewEditComponent } from './lesson-plan-view-edit/lesson-plan-view-edit.component';
import { MarkdownModule, MarkedOptions } from 'ngx-markdown';
import { LessonPlanFormatsComponent } from './lesson-plan-formats/lesson-plan-formats.component';
import { LessonPlanVideosComponent } from './lesson-plan-videos/lesson-plan-videos.component';
import { LessonPlanDocumentsComponent } from './lesson-plan-documents/lesson-plan-documents.component';
import { LessonPlanSubjectDetailsComponent } from './lesson-plan-subject-details/lesson-plan-subject-details.component';

@NgModule({
  declarations: [
    LessonContentListComponent,
    FormatContentPipe,
    LessonPlanViewEditComponent,
    LessonPlanFormatsComponent,
    LessonPlanVideosComponent,
    LessonPlanDocumentsComponent,
    LessonPlanSubjectDetailsComponent,
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
    DeleteDetailComponent,
    MarkdownModule.forRoot({
      markedOptions: {
        provide: MarkedOptions,
        useValue: {
          breaks: true,
        },
      },
    }),
  ],
  exports: [
    FormatContentPipe,
    LessonPlanFormatsComponent,
    LessonPlanSubjectDetailsComponent,
  ],
})
export class ContentGenerationModule {}
