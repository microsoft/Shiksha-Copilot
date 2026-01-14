import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './profile/profile.component';
import { PermissionGuard } from 'src/app/core/guards/permission.guard';
import { IsProfileCompleteGuard } from 'src/app/core/guards/isProfileComplete.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LessonContentListComponent } from './content-generation/lesson-content-list/lesson-content-list.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { BaselineSurveyGuard } from 'src/app/core/guards/baseline-survey.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component:DashboardComponent,
    data: {
      permissions: ['standard', 'power'],
    },
    canActivate: [PermissionGuard, IsProfileCompleteGuard, BaselineSurveyGuard],
  },
  {
    path: 'content-generation',
    loadChildren: () =>
      import('./content-generation/content-generation.module').then(
        (m) => m.ContentGenerationModule
      ),
    data: {
      permissions: ['standard', 'power'],
    },
    canActivate: [PermissionGuard, IsProfileCompleteGuard,BaselineSurveyGuard],
  },
  {
    path: 'generation-status',
    component:LessonContentListComponent,
    data: {
      permissions: ['power'],
      type:'status'
    },
    canActivate: [PermissionGuard, IsProfileCompleteGuard,BaselineSurveyGuard],
  },
  {
    path: 'profile',
    component: ProfileComponent,
    data: {
      permissions: ['standard', 'power'],
    },
    canActivate: [PermissionGuard],
  },
  {
    path: 'chatbot',
    component:ChatbotComponent,
    data: {
      permissions: ['power'],
      type:'general'
    },
    canActivate: [PermissionGuard, IsProfileCompleteGuard,BaselineSurveyGuard],
  },
  {
    path: 'question-paper',
    loadChildren:()=> import('./question-bank/question-bank.module').then(m=>m.QuestionBankModule),
    data: {
      permissions: ['standard', 'power'],
    },
    canActivate: [PermissionGuard, IsProfileCompleteGuard,BaselineSurveyGuard],
  },
  {
    path: 'schedule',
    loadChildren: () =>
      import('./schedule/schedule.module').then((m) => m.ScheduleModule),
    data: {
      permissions: ['standard', 'power'],
    },
    canActivate: [PermissionGuard, IsProfileCompleteGuard,BaselineSurveyGuard],
  },
  {
    path: 'help',
    loadComponent:()=> import('./help/help.component').then((c)=>c.HelpComponent),
    data: {
      permissions: ['standard', 'power'],
    },
    canActivate: [PermissionGuard],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}
