import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectLessonResourcesComponent } from './inspect-lesson-resources.component';

describe('InspectLessonResourcesComponent', () => {
  let component: InspectLessonResourcesComponent;
  let fixture: ComponentFixture<InspectLessonResourcesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InspectLessonResourcesComponent]
    });
    fixture = TestBed.createComponent(InspectLessonResourcesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
