import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
} from '@angular/router';
import { UtilityService } from '../services/utility.service';

export const PermissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
) => {
  const utilityServcie = inject(UtilityService);

  if (utilityServcie.hasPermission(route.data?.['permissions'])) {
    return true;
  } else {
    return false;
  }
};
