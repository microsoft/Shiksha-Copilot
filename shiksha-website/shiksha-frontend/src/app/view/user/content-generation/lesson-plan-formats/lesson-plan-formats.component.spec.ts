import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonPlanFormatsComponent } from './lesson-plan-formats.component';

describe('LessonPlanFormatsComponent', () => {
  let component: LessonPlanFormatsComponent;
  let fixture: ComponentFixture<LessonPlanFormatsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LessonPlanFormatsComponent]
    });
    fixture = TestBed.createComponent(LessonPlanFormatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
