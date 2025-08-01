import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentActivityComponent } from './content-activity.component';

describe('ContentActivityComponent', () => {
  let component: ContentActivityComponent;
  let fixture: ComponentFixture<ContentActivityComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContentActivityComponent]
    });
    fixture = TestBed.createComponent(ContentActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
