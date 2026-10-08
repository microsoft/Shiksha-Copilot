import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { BaselineSurveyComponent } from 'src/app/shared/components/baseline-survey/baseline-survey.component';

@Injectable({ providedIn: 'root' })
export class BaselineSurveyDialogService {
  private dialog = inject(MatDialog);

  private sessionKey(userId: string | number) {
    const year = new Date().getFullYear();
    return `baseline:shown:${userId}:${year}`;
  }

  /** Opens the survey dialog (blocking by default). Returns true if submitted. */
  async openSurvey(force = true): Promise<boolean> {
    let userId = '';
    try {
      const stored = localStorage.getItem('userData');
      userId = stored ? JSON.parse(stored)?._id || '' : '';
    } catch {}

    const key = userId ? this.sessionKey(userId) : `baseline:shown:anon:${new Date().getFullYear()}`;
    if (localStorage.getItem(key) === '1') return false;

    const ref = this.dialog.open(BaselineSurveyComponent, {
      width: '720px',
      disableClose: force,
      autoFocus: true,
      data: { force }
    });

    const result = await firstValueFrom(ref.afterClosed());
    if (result === true) localStorage.setItem(key, '1');
    return result === true;
  }
}
