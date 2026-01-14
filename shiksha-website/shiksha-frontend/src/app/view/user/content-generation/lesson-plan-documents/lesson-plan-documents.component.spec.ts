import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonPlanDocumentsComponent } from './lesson-plan-documents.component';

describe('LessonPlanDocumentsComponent', () => {
  let component: LessonPlanDocumentsComponent;
  let fixture: ComponentFixture<LessonPlanDocumentsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LessonPlanDocumentsComponent]
    });
    fixture = TestBed.createComponent(LessonPlanDocumentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
