import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { UtilityService } from '../services/utility.service';

export const IsProfileCompleteGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const data: string = localStorage.getItem('userData') ?? '';
  const loggedInUser = JSON.parse(data);
  const utilityServcie = inject(UtilityService);
  const router = inject(Router);

  if (loggedInUser.isProfileCompleted) {
    return true;
  } else {
    utilityServcie.showWarning(
      'Please complete the profile for further access'
    );
    router.navigate(['/user/profile']);
    return false;
  }
};
