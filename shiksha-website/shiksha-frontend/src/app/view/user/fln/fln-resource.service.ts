import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Lesson {
  day: number;
  grade: string;
  learning_outcome: string;
  concept: string;
  teaching_strategy: string;
  activity: string;
  assessment_questions: string[];
  practice_questions: string[];
  teacher_notes: string;
}

@Injectable({ providedIn: 'root' })
export class FlnResourceService {
 baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getGrades(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/fln/grades`);
  }

  getDays(grade: string): Observable<number[]> {
    return this.http.get<number[]>(`${this.baseUrl}/fln/days`, { params: { grade } });
  }

  getLesson(grade: string, day: number): Observable<Lesson> {
    return this.http.get<Lesson>(`${this.baseUrl}/fln`, { params: { grade, day } });
  }
}
