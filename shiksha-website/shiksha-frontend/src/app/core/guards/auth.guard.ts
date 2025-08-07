import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from "@angular/router";
import { AuthorizationService } from "../services/authorization.service";
import { LOGIN_ROUTE } from "src/app/shared/utility/constant.util";


export const AuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const router = inject(Router);
    const authorizationService = inject(AuthorizationService)
  
    if (authorizationService.isLoggedIn()) {
      return true;
    } else {
      router.navigate([LOGIN_ROUTE]);
      return false;
    }
  }