import { Injectable } from '@angular/core';
import { DEFAULT_INTERRUPTSOURCES, Idle } from '@ng-idle/core';
import { filter, Subject } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { TimerService } from './timer.service';
import {
  IDLE_START_THRESHOLD,
  IDLE_WARNING_THRESHOLD,
  INTERACTION_LOG_THRESHOLD,
} from '../utility/constant.util';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class IdleService {
  private idleThreshold = IDLE_START_THRESHOLD;
  private warningThreshold = IDLE_WARNING_THRESHOLD;

  private moduleName: any;
  private previousModule: any;

  idleIndicator: Subject<any> = new Subject();

  customIdleTrackerRoutes: any[] = [
    '/auth/signin',
    '/user/content-generation',
    '/user/content-generation/lesson-plan',
    '/user/content-generation/lesson-resources',
  ];

  skipIdleActivityRoutes: any[] = [
    '/user/content-generation/inspect-lesson-plan',
    '/user/content-generation/inspect-lesson-resources',
  ];

  isCustom = false;

  isSkip = false;

  draftId: any;

  planId: any;

  isCompleted = false;

  constructor(
    private idle: Idle,
    private router: Router,
    private timerService: TimerService,
    private httpClient: HttpClient
  ) {
    this.initializeIdleTracking();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe({
        next: (val: any) => {
          this.moduleName = val.url;
          this.isCustom =
            this.customIdleTrackerRoutes.includes(val.urlAfterRedirects) ||
            val.urlAfterRedirects.includes('admin');
          this.isSkip = this.skipIdleActivityRoutes.includes(
            val.urlAfterRedirects
          );

          if (this.timerService.getCurrentTime('interaction') && !this.isSkip) {
            let trackObj: any = {
              moduleName: this.getModuleName(this.previousModule),
              idleTime: this.timerService.getCurrentTime('idle'),
              interactionTime: this.timerService.getCurrentTime('interaction'),
            };

            if (this.planId) {
              trackObj.planId = this.planId;
            }

            if (this.draftId) {
              trackObj.draftId = this.draftId;
              trackObj.isCompleted = this.isCompleted;
            }

            if (
              trackObj.interactionTime >= INTERACTION_LOG_THRESHOLD &&
              trackObj.moduleName
            ) {
              this.logActivity(trackObj);
            }

            this.timerService.resetTimer('idle');
            this.timerService.resetTimer('interaction');
            if (!this.isSkip) {
              this.idle.stop();
            }
          }

          if (!this.isCustom) {
            this.startWatching();
          }
        },
      });
  }

  private initializeIdleTracking() {
    this.idle.setIdle(this.idleThreshold);
    this.idle.setTimeout(this.warningThreshold);
    this.idle.setInterrupts(DEFAULT_INTERRUPTSOURCES);

    this.idle.onIdleStart.subscribe(() => {
      this.timerService.startTimer('idle');
      this.timerService.pauseTimer('interaction');
    });

    this.idle.onTimeout.subscribe(() => {
      this.timerService.pauseTimer('idle');
      this.timerService.pauseTimer('interaction');
      this.idleIndicator.next(true);
    });

    this.idle.onIdleEnd.subscribe(() => {
      this.timerService.pauseTimer('idle');
      this.timerService.resumeTimer('interaction');
    });
  }

  private getModuleName(url: string): string {
    const matchedModuleName = this.customModuleMatcher(url);
    const parts = url.split('/');
    let modName: any;

    parts.forEach((uri) => {
      if (uri) {
        modName = modName + '/' + uri;
      }
    });

    if (matchedModuleName) {
      return matchedModuleName;
    }
    return parts.length > 2 ? parts[2] : '';
  }

  customModuleMatcher(url: string): string | null {
    const routePatterns = {
      'view-lp': /^\/user\/content-generation\/lesson-plan\/([a-f0-9]{24})$/,
      'view-lr': /^\/user\/content-generation\/resource-plan\/([a-f0-9]{24})$/,
      'lesson-chat': /^\/user\/content-generation\/lesson-chat/,
      'view-question-bank': /^\/user\/question-bank\/view\/([a-f0-9]{24})$/
    };

    for (const [routeName, pattern] of Object.entries(routePatterns)) {
      if (pattern.test(url)) {
        return routeName;
      }
    }

    return null;
  }

  startWatching() {
    if (!this.isCustom) {
      this.previousModule = this.moduleName;
    }
    this.idle.watch();
    this.timerService.startTimer('interaction');
  }

  stopWatching(moduleName?: any) {
    let trackObj: any = {
      moduleName: moduleName ? moduleName : this.getCurrentModuleName(),
      idleTime: this.timerService.getCurrentTime('idle'),
      interactionTime: this.timerService.getCurrentTime('interaction'),
    };
    if (this.planId) {
      trackObj.planId = this.planId;
    }

    if (this.draftId) {
      trackObj.draftId = this.draftId;
      trackObj.isCompleted = this.isCompleted;
    }
    if (
      trackObj.interactionTime >= INTERACTION_LOG_THRESHOLD &&
      trackObj.moduleName
    ) {
      this.logActivity(trackObj);
    }

    this.resetIdler();
  }

  getCurrentModuleName() {
    const isDraft = this.moduleName.includes('draft');
    if (this.isCustom || this.isSkip || isDraft) {
      return null;
    } else {
      return this.getModuleName(this.moduleName);
    }
  }

  resetIdler() {
    this.timerService.resetTimer('idle');
    this.timerService.resetTimer('interaction');
    this.idle.stop();
  }

  logActivity(trackObj: any) {
    this.httpClient
      .post(`${environment.apiUrl}/user/activity-log`, trackObj)
      .subscribe({
        next: (val) => {
          this.draftId = null;
          this.planId = null;
          this.isCompleted = false;
        },
        error: (err) => {
          console.log(err);
        },
      });
  }
}
