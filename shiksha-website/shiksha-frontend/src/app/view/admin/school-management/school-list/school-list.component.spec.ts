import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolListComponent } from './school-list.component';

describe('SchoolListComponent', () => {
  let component: SchoolListComponent;
  let fixture: ComponentFixture<SchoolListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SchoolListComponent]
    });
    fixture = TestBed.createComponent(SchoolListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
