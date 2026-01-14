import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonPlanVideosComponent } from './lesson-plan-videos.component';

describe('LessonPlanVideosComponent', () => {
  let component: LessonPlanVideosComponent;
  let fixture: ComponentFixture<LessonPlanVideosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LessonPlanVideosComponent]
    });
    fixture = TestBed.createComponent(LessonPlanVideosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
