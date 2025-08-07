import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooseLessonPlanComponent } from './choose-lesson-plan.component';

describe('ChooseLessonPlanComponent', () => {
  let component: ChooseLessonPlanComponent;
  let fixture: ComponentFixture<ChooseLessonPlanComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChooseLessonPlanComponent]
    });
    fixture = TestBed.createComponent(ChooseLessonPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
