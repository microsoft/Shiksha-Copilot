import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectLessonPlanComponent } from './inspect-lesson-plan.component';

describe('InspectLessonPlanComponent', () => {
  let component: InspectLessonPlanComponent;
  let fixture: ComponentFixture<InspectLessonPlanComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InspectLessonPlanComponent]
    });
    fixture = TestBed.createComponent(InspectLessonPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
