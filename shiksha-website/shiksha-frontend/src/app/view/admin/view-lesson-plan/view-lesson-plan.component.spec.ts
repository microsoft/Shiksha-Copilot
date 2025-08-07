import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewLessonPlanComponent } from './view-lesson-plan.component';

describe('ViewLessonPlanComponent', () => {
  let component: ViewLessonPlanComponent;
  let fixture: ComponentFixture<ViewLessonPlanComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ViewLessonPlanComponent]
    });
    fixture = TestBed.createComponent(ViewLessonPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
