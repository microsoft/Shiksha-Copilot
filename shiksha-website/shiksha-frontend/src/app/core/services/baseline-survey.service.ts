import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class BaselineSurveyService {
  private baseUrl = `${environment.apiUrl}/baseline-surveys`;
  private surveyCompleted: boolean | null = null;
  private cachedUserId: string | null = null;

  constructor(private http: HttpClient) {}

  private getUserId(): string | null {
    try {
      const stored = localStorage.getItem('userData');
      return stored ? (JSON.parse(stored)?._id || null) : null;
    } catch {
      return null;
    }
  }

  private resetCacheIfNeeded(userId: string | null) {
    if (!userId) {
      this.cachedUserId = null;
      this.surveyCompleted = null;
      return;
    }

    if (userId !== this.cachedUserId) {
      this.cachedUserId = userId;
      this.surveyCompleted = null;
    }
  }

  checkCompleted(): Observable<{ success: boolean; data: { completed: boolean } }> {
    const uid = this.getUserId();

    this.resetCacheIfNeeded(uid);

    if (this.surveyCompleted !== null) {
      return of({ success: true, data: { completed: this.surveyCompleted } });
    }

    return this.http
      .get<{ success: boolean; data: { completed: boolean } }>(`${this.baseUrl}/check`)
      .pipe(
        map(res => {
          const completed = !!res?.data?.completed;
          this.surveyCompleted = completed;
          return { success: !!res?.success, data: { completed } };
        }),
        catchError(error => {
          console.error('Error checking survey status:', error);
          return of({ success: false, data: { completed: false } });
        })
      );
  }

  submitSurvey(surveyData: any) {
    return this.http.post<{ success: boolean; message?: string }>(this.baseUrl, surveyData).pipe(
      map(response => {
        if (response.success) {
          const uid = this.getUserId();
          this.resetCacheIfNeeded(uid);
          this.surveyCompleted = true;
        }
        return response;
      }),
      catchError(error => {
        if (error?.status === 409) {
          const uid = this.getUserId();
          this.resetCacheIfNeeded(uid);
          this.surveyCompleted = true;
          return of({ success: true, message: 'Already submitted' });
        }
        console.error('Error submitting survey:', error);
        return of({ success: false, message: 'Failed to submit survey' });
      })
    );
  }
}
