import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string | string[];
  state: string;
  zone?: string;
  district?: string;
  zones?: string[];
  districts?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  getFLNLastViewed(): Observable<{grade: string, day: number}> {
    return this.http.get<{grade: string, day: number}>(`${this.baseUrl}/user/fln-last-viewed`);
  }

  setFLNLastViewed(grade: string, day: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/fln-last-viewed`, { grade, day });
  }
} 