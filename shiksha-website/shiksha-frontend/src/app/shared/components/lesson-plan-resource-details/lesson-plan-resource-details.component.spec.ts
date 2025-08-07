import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonPlanResourceDetailsComponent } from './lesson-plan-resource-details.component';

describe('LessonPlanResourceDetailsComponent', () => {
  let component: LessonPlanResourceDetailsComponent;
  let fixture: ComponentFixture<LessonPlanResourceDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LessonPlanResourceDetailsComponent]
    });
    fixture = TestBed.createComponent(LessonPlanResourceDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
