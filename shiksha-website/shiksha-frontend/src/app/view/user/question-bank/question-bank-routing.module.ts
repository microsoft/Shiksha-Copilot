import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionBankListComponent } from './question-bank-list/question-bank-list.component';
import { QuestionBankGenerationComponent } from './question-bank-generation/question-bank-generation.component';
import { QuestionBankViewComponent } from './question-bank-view/question-bank-view.component';

const routes: Routes = [
  {
    path: '',
    component: QuestionBankListComponent,
  },
  {
    path: 'generate',
    component: QuestionBankGenerationComponent,
  },
  {
    path: 'view/:id',
    component: QuestionBankViewComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class questionBankRoutingModule {}
