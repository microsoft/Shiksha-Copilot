import { TestBed } from '@angular/core/testing';

import { ShikshanService } from './shikshan-user.service';

describe('ShikshanService', () => {
  let service: ShikshanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShikshanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
