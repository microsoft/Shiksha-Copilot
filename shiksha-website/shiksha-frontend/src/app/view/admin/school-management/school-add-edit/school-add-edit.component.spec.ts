import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolAddEditComponent } from './school-add-edit.component';

describe('SchoolAddEditComponent', () => {
  let component: SchoolAddEditComponent;
  let fixture: ComponentFixture<SchoolAddEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SchoolAddEditComponent]
    });
    fixture = TestBed.createComponent(SchoolAddEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
