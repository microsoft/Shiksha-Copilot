import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DropDownConfig } from 'src/app/shared/interfaces/dropdown.interface';
import { QUESTION_TYPE } from 'src/app/shared/utility/constant.util';

@Component({
  selector: 'app-question-bank-template',
  templateUrl: './question-bank-template.component.html',
  styleUrls: ['./question-bank-template.component.scss'],
})
export class QuestionBankTemplateComponent {
  @Input() currentStep: number = 1;

  @Input() totalMarks: any;

  @Input() templateData!: any[];

  @Input() submittedTemplate = false;

  @Input() totalTemplateMarks = 0;

  @Output() backClick = new EventEmitter<boolean>();

  @Output() totalTemplateMarksUpdate = new EventEmitter<number>();

  questionTypeDropdownOptions: any[] = QUESTION_TYPE;

  questionTypeDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select Type',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'value',
    required: true,
    clearableOff: true,
  };

  totalSteps: number = 3;

  templateTableHeaders = [
    'Question Type',
    'Number of Questions',
    'Marks per Question',
    'Action',
  ];

  addQuestionBankTemplateRow(): void {
    this.templateData.push({
      type: null,
      number_of_questions: null,
      marks_per_question: null,
      question_distribution: null,
    });
  }

  removeQuestionBankTemplateRow(index: number): void {
    this.templateData.splice(index, 1);
    this.reCalculateValue();
  }

  reCalculateTemplate(i: any, type: any) {
    this.templateData[i][type] = parseInt(this.templateData[i][type]) || null;
    this.reCalculateValue();
  }

  reCalculateValue() {
    const templateValues = this.templateData;
    this.totalTemplateMarks = templateValues.reduce((acc: any, cur: any) => {
      return acc + cur.number_of_questions * cur.marks_per_question;
    }, 0);

    this.totalTemplateMarksUpdate.emit(this.totalTemplateMarks);
  }

  previousStep() {
    this.backClick.emit(true);
  }
}
