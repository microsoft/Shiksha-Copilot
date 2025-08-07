import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisablePopupComponent } from './disable-popup.component';

describe('DisablePopupComponent', () => {
  let component: DisablePopupComponent;
  let fixture: ComponentFixture<DisablePopupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DisablePopupComponent]
    });
    fixture = TestBed.createComponent(DisablePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
