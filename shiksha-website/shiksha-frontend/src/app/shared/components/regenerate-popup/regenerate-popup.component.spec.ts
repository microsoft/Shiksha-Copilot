import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegeneratePopupComponent } from './regenerate-popup.component';

describe('RegeneratePopupComponent', () => {
  let component: RegeneratePopupComponent;
  let fixture: ComponentFixture<RegeneratePopupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RegeneratePopupComponent]
    });
    fixture = TestBed.createComponent(RegeneratePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
