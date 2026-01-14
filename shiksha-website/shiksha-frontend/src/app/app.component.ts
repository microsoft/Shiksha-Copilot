import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { SignInService } from './auth/sign-in.service';
import { UtilityService } from './core/services/utility.service';
import { AuthorizationService } from './core/services/authorization.service';
import { IdleService } from './shared/services/idle.service';
import { IDLE_START_THRESHOLD, IDLE_WARNING_THRESHOLD } from './shared/utility/constant.util';

import { BaselineSurveyService } from './core/services/baseline-survey.service';
import { BaselineSurveyDialogService } from './core/services/baseline-survey-dialog.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'shiksha-frontend';

  showIdleWarning = false;
  idleTime = Math.round((IDLE_WARNING_THRESHOLD + IDLE_START_THRESHOLD) / 60);

  constructor(
    private authService: SignInService,
    private utilityService: UtilityService,
    private router: Router,
    private authorizationService: AuthorizationService,
    private idleService: IdleService,
    private baselineSurveyService: BaselineSurveyService,
    private baselineSurveyDialog: BaselineSurveyDialogService
  ) {}

  ngOnInit(): void {

    // ========== IDLE WATCHER ==========
    this.idleService.idleIndicator.subscribe({
      next: () => {
        this.showIdleWarning = true;
      }
    });

    // ========== FETCH USER + CHECK BASELINE ==========
    if (this.authorizationService.isLoggedIn()) {
      this.authService.authMe().subscribe({
        next: (res: any) => {
          const user = res?.data ?? null;

          if (user) {
            localStorage.setItem('userData', JSON.stringify(user));

            // Only teachers / end users should see baseline survey
            if (this.isEndUser(user)) {
              this.checkBaselineStatus();
            }
          }
        },
        error: (err: any) => {
          this.utilityService.handleError(err);

          // fallback: use stored data
          const stored = localStorage.getItem('userData');
          if (stored) {
            try {
              const u = JSON.parse(stored);
              if (this.isEndUser(u)) {
                this.checkBaselineStatus();
              }
            } catch {}
          }
        }
      });
    }

    // ========== BEFORE UNLOAD ==========
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  // ------ Determine which roles should see survey ------
  private isEndUser(user: any): boolean {
    const roles: string[] = Array.isArray(user?.role)
      ? user.role
      : [user?.role].filter(Boolean);

    const END_USER_ROLES = new Set(['teacher', 'user', 'end_user', 'librarian']);
    const EXCLUDE = new Set(['manager', 'admin', 'super_admin']);

    if (roles.some(r => EXCLUDE.has(String(r).toLowerCase()))) return false;
    if (roles.some(r => END_USER_ROLES.has(String(r).toLowerCase()))) return true;

    return false;
  }

  // ------ Check baseline survey completion ------
  private async checkBaselineStatus(): Promise<void> {
    try {
      const response = await firstValueFrom(this.baselineSurveyService.checkCompleted());

      if (response?.success && !response.data?.completed) {
        const submitted = await this.baselineSurveyDialog.openSurvey();

        if (submitted) {
          this.utilityService.showSuccess('Thank you for completing the survey!');
        }
      }
    } catch (error) {
      console.error('Error checking baseline survey status:', error);
    }
  }

  // ------ User leaving tab/window ------
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    console.log('User is about to close the tab or navigate away.');
    this.idleService.stopWatching();
  }

  // ------ Idle modal close ------
  closeModal(val: any) {
    if (val !== 'close') {
      this.idleService.startWatching();
    }
    this.showIdleWarning = false;
  }

  // ------ Update basic user data (legacy support) ------
  updateUserData() {
    this.authService.authMe().subscribe({
      next: (res: any) => {
        localStorage.setItem('userData', JSON.stringify(res?.data));
      },
      error: (err: any) => {
        this.utilityService.handleError(err);
      },
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }
}

