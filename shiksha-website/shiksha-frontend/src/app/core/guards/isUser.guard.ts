import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';

export const IsUserGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const data = localStorage.getItem('userData') || '';
  const userData = JSON.parse(data);
  if (userData?.role.includes('admin') || userData?.role.includes('manager')) {
    router.navigate(['/admin']);
    return false;
  }
  return true;
};
