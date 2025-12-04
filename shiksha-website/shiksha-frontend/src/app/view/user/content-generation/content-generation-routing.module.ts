import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LessonContentListComponent } from './lesson-content-list/lesson-content-list.component';
import { LessonPlanResourceDetailsComponent } from 'src/app/shared/components/lesson-plan-resource-details/lesson-plan-resource-details.component';
import { DraftGuard } from 'src/app/core/guards/draft.guard';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { PermissionGuard } from 'src/app/core/guards/permission.guard';
import { LessonPlanViewEditComponent } from './lesson-plan-view-edit/lesson-plan-view-edit.component';

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
    path:'inspect/:planType',
    component:LessonPlanViewEditComponent,
    canDeactivate:[DraftGuard],
    data:{
      mode:'generate'
    }
  },
  {
    path:':planType/:id',
    component:LessonPlanViewEditComponent,
    canDeactivate:[DraftGuard],
    data:{
      mode:'view'
    }
  },
  {
    path:':planType/draft/:id',
    component:LessonPlanViewEditComponent,
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
