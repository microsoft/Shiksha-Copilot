import { Injectable, NgZone, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

import { AuthorizationService } from '../services/authorization.service';
import { SignInService } from 'src/app/auth/sign-in.service';
import { BaselineSurveyService } from '../services/baseline-survey.service';
import { BaselineSurveyDialogService } from '../services/baseline-survey-dialog.service';

@Injectable({ providedIn: 'root' })
export class BaselineSurveyGuard implements CanActivate {
  private authz = inject(AuthorizationService);
  private auth = inject(SignInService);
  private survey = inject(BaselineSurveyService);
  private dialog = inject(BaselineSurveyDialogService);
  private zone = inject(NgZone);

  async canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Promise<boolean> {
    // If not logged in, don’t block routing here.
    if (!this.authz.isLoggedIn()) return true;

    // 1) Ensure we have fresh user (and roles)
    try {
      const res: any = await firstValueFrom(this.auth.authMe());
      if (res?.data) localStorage.setItem('userData', JSON.stringify(res.data));
    } catch {
      // fall back to stored user if present
    }

    const user = this.getUser();
    if (!this.isEndUser(user)) return true; // skip for managers/admins

    // 2) Check completion
    try {
      const resp = await firstValueFrom(this.survey.checkCompleted());
      const completed = !!resp?.data?.completed;

      // 3) Open dialog if not completed
      if (!completed) {
        // Defer dialog open to next macrotask to avoid change detection race with navigation
        this.zone.runOutsideAngular(() => {
          setTimeout(() => {
            this.zone.run(() => {
              // fire-and-forget so guard returns immediately
              void this.dialog.openSurvey(true);
            });
          }, 0);
        });
      }
    } catch (e) {
      // swallow errors so routing isn't blocked
      console.error('[BaselineSurveyGuard] check/open failed', e);
    }

    return true;
  }

  private getUser(): any {
    try {
      const s = localStorage.getItem('userData');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }

  /** Treat everyone who is NOT an admin/manager as an end-user */
  private isEndUser(user: any): boolean {
    const roles: string[] = Array.isArray(user?.role) ? user.role : [user?.role].filter(Boolean);
    if (!roles.length) return false;

    const lower = roles.map(r => String(r).toLowerCase());
    const EXCLUDE = new Set(['admin', 'manager', 'super_admin', 'coordinator', 'trainer']);

    if (lower.some(r => EXCLUDE.has(r))) return false;
    return true;
  }
}
