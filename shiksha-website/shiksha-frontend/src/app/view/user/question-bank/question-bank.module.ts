import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionBankGenerationComponent } from './question-bank-generation/question-bank-generation.component';
import { QuestionBankListComponent } from './question-bank-list/question-bank-list.component';
import { QuestionBankViewComponent } from './question-bank-view/question-bank-view.component';
import { questionBankRoutingModule } from './question-bank-routing.module';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormDropdownComponent } from 'src/app/shared/components/form-dropdown/form-dropdown.component';
import { CommonDropdownComponent } from 'src/app/shared/components/common-dropdown/common-dropdown.component';
import { DeleteDetailComponent } from 'src/app/shared/components/delete-detail/delete-detail.component';
import { NgChartsModule } from 'ng2-charts';
import { QuestionBankTemplateComponent } from './question-bank-generation/question-bank-template/question-bank-template.component';
import { QuestionBankBluePrintComponent } from './question-bank-generation/question-bank-blue-print/question-bank-blue-print.component';

@NgModule({
  declarations: [
    QuestionBankGenerationComponent,
    QuestionBankTemplateComponent,
    QuestionBankBluePrintComponent,
    QuestionBankListComponent,
    QuestionBankViewComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    questionBankRoutingModule,
    TranslateModule,
    FormDropdownComponent,
    CommonDropdownComponent,
    DeleteDetailComponent,
    NgChartsModule
  ],
})
export class QuestionBankModule {}
