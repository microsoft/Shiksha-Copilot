import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionBankListComponent } from './question-bank-list.component';

describe('QuestionBankListComponent', () => {
  let component: QuestionBankListComponent;
  let fixture: ComponentFixture<QuestionBankListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QuestionBankListComponent]
    });
    fixture = TestBed.createComponent(QuestionBankListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
