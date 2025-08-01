import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionBankGenerationComponent } from './question-bank-generation.component';

describe('QuestionBankGenerationComponent', () => {
  let component: QuestionBankGenerationComponent;
  let fixture: ComponentFixture<QuestionBankGenerationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QuestionBankGenerationComponent]
    });
    fixture = TestBed.createComponent(QuestionBankGenerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
