import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonPlanViewEditComponent } from './lesson-plan-view-edit.component';

describe('LessonPlanViewEditComponent', () => {
  let component: LessonPlanViewEditComponent;
  let fixture: ComponentFixture<LessonPlanViewEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LessonPlanViewEditComponent]
    });
    fixture = TestBed.createComponent(LessonPlanViewEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
