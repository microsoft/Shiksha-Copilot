import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShikshanUserManageComponent } from './shikshan-user-manage.component';

describe('ShikshanUserManageComponent', () => {
  let component: ShikshanUserManageComponent;
  let fixture: ComponentFixture<ShikshanUserManageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ShikshanUserManageComponent]
    });
    fixture = TestBed.createComponent(ShikshanUserManageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
