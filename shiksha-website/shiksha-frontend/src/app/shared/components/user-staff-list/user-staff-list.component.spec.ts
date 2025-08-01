import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserStaffListComponent } from './user-staff-list.component';

describe('UserStaffListComponent', () => {
  let component: UserStaffListComponent;
  let fixture: ComponentFixture<UserStaffListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UserStaffListComponent]
    });
    fixture = TestBed.createComponent(UserStaffListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
