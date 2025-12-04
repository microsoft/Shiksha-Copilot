import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonPlanSubjectDetailsComponent } from './lesson-plan-subject-details.component';

describe('LessonPlanSubjectDetailsComponent', () => {
  let component: LessonPlanSubjectDetailsComponent;
  let fixture: ComponentFixture<LessonPlanSubjectDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LessonPlanSubjectDetailsComponent]
    });
    fixture = TestBed.createComponent(LessonPlanSubjectDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
