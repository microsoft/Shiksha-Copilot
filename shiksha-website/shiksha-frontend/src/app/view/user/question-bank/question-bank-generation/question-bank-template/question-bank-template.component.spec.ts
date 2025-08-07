import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionBankTemplateComponent } from './question-bank-template.component';

describe('QuestionBankTemplateComponent', () => {
  let component: QuestionBankTemplateComponent;
  let fixture: ComponentFixture<QuestionBankTemplateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QuestionBankTemplateComponent]
    });
    fixture = TestBed.createComponent(QuestionBankTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
