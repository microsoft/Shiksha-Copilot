import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LessonContentListComponent } from './lesson-content-list/lesson-content-list.component';
import { ChooseLessonPlanComponent } from './choose-lesson-plan/choose-lesson-plan.component';
import { InspectLessonPlanComponent } from './inspect-lesson-plan/inspect-lesson-plan.component';
import { InspectLessonResourcesComponent } from './inspect-lesson-resources/inspect-lesson-resources.component';
import { LessonPlanResourceDetailsComponent } from 'src/app/shared/components/lesson-plan-resource-details/lesson-plan-resource-details.component';
import { DraftGuard } from 'src/app/core/guards/draft.guard';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { PermissionGuard } from 'src/app/core/guards/permission.guard';

const routes: Routes = [
  {
    path:'',
    component:LessonContentListComponent,
    data:{
      type:'generated'
    }
  },
  {
    path:'lesson-resources',
    component:LessonPlanResourceDetailsComponent
  },
  {
    path:'lesson-plan',
    component:LessonPlanResourceDetailsComponent
  },
  {
    path:'choose-lesson-plan',
    component:ChooseLessonPlanComponent
  },
  {
    path:'inspect-lesson-plan',
    component:InspectLessonPlanComponent,
    canDeactivate:[DraftGuard],
    data:{
      mode:'generate'
    }
  },
  {
    path:'lesson-plan/:id',
    component:InspectLessonPlanComponent,
    canDeactivate:[DraftGuard],
    data:{
      mode:'view'
    }
  },
  {
    path:'lesson-plan/draft/:id',
    component:InspectLessonPlanComponent,
    canDeactivate:[DraftGuard],
    data:{
      mode:'draft'
    }
  },
  {
    path:'inspect-lesson-resources',
    component:InspectLessonResourcesComponent,
    canDeactivate:[DraftGuard],
    data:{
      mode:'generate'
    }
  },
  {
    path:'resource-plan/:id',
    component:InspectLessonResourcesComponent,
    canDeactivate:[DraftGuard],
    data:{
      mode:'view'
    }
  },
  {
    path:'resource-plan/draft/:id',
    component:InspectLessonResourcesComponent,
    canDeactivate:[DraftGuard],
    data:{
      mode:'draft'
    }
  },
  {
    path:'lesson-chat',
    component:ChatbotComponent,
    data:{
      type:'index',
      permissions: ['power'],
    },
    canActivate: [PermissionGuard],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ContentGenerationRoutingModule { }
