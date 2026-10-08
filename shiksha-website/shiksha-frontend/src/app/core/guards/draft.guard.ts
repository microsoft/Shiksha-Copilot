import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ContentGenerationService } from 'src/app/view/user/content-generation/content-generation.service';
import { LessonPlanViewEditComponent } from 'src/app/view/user/content-generation/lesson-plan-view-edit/lesson-plan-view-edit.component';

export const DraftGuard: CanDeactivateFn<
  LessonPlanViewEditComponent
> = (
  component: LessonPlanViewEditComponent
) => {
  const contenGenerationService = inject(ContentGenerationService);
  if (component.hasUnsavedChanges) {
    contenGenerationService.showDraftConfirmation = true;
    return false;
  }
  return true;
};
