import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadErrorPopupComponent } from './upload-error-popup.component';

describe('UploadErrorPopupComponent', () => {
  let component: UploadErrorPopupComponent;
  let fixture: ComponentFixture<UploadErrorPopupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UploadErrorPopupComponent]
    });
    fixture = TestBed.createComponent(UploadErrorPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
