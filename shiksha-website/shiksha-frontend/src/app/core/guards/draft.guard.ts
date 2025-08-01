import { inject } from '@angular/core';
import { CanDeactivateFn, NavigationStart, Router } from '@angular/router';
import { ContentGenerationService } from 'src/app/view/user/content-generation/content-generation.service';
import { InspectLessonPlanComponent } from 'src/app/view/user/content-generation/inspect-lesson-plan/inspect-lesson-plan.component';
import { InspectLessonResourcesComponent } from 'src/app/view/user/content-generation/inspect-lesson-resources/inspect-lesson-resources.component';

export const DraftGuard: CanDeactivateFn<
  InspectLessonPlanComponent | InspectLessonResourcesComponent
> = (
  component: InspectLessonPlanComponent | InspectLessonResourcesComponent
) => {
  const contenGenerationService = inject(ContentGenerationService);
  if (component.hasUnsavedChanges) {
    contenGenerationService.showDraftConfirmation = true;
    return false;
  }
  return true;
};
