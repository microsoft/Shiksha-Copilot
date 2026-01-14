import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaselineSurveyComponent } from './baseline-survey.component';

describe('BaselineSurveyComponent', () => {
  let component: BaselineSurveyComponent;
  let fixture: ComponentFixture<BaselineSurveyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BaselineSurveyComponent]
    });
    fixture = TestBed.createComponent(BaselineSurveyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
