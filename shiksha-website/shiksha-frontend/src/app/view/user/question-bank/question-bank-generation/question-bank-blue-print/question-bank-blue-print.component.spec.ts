import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionBankBluePrintComponent } from './question-bank-blue-print.component';

describe('QuestionBankBluePrintComponent', () => {
  let component: QuestionBankBluePrintComponent;
  let fixture: ComponentFixture<QuestionBankBluePrintComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QuestionBankBluePrintComponent]
    });
    fixture = TestBed.createComponent(QuestionBankBluePrintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
