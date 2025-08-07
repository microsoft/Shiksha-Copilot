import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionBankViewComponent } from './question-bank-view.component';

describe('QuestionBankViewComponent', () => {
  let component: QuestionBankViewComponent;
  let fixture: ComponentFixture<QuestionBankViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QuestionBankViewComponent]
    });
    fixture = TestBed.createComponent(QuestionBankViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
