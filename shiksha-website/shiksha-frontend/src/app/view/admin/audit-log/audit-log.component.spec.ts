import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditLogComponent } from './audit-log.component';

describe('AuditLogComponent', () => {
  let component: AuditLogComponent;
  let fixture: ComponentFixture<AuditLogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuditLogComponent]
    });
    fixture = TestBed.createComponent(AuditLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
