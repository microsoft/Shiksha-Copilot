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
  private apiUrl = environment.apiUrl;

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

  public getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(map(response => {
        if (response.success && response.data) {
          const user = response.data;
          localStorage.setItem('currentUser', JSON.stringify(user));
          if (user.token) {
            localStorage.setItem('token', user.token);
          }
          this.currentUserSubject.next(user);
          return user;
        }
        throw new Error('Login failed');
      }));
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  getUserLocation(): { state: string | null; zone: string | null; district: string | null } {
    const user = this.getCurrentUser();
    return {
      state: user?.state || null,
      zone: user?.zone || null,
      district: user?.district || null
    };
  }

  getFLNLastViewed(): Observable<{grade: string, day: number}> {
    return this.http.get<{grade: string, day: number}>(`${this.apiUrl}/user/fln-last-viewed`);
  }

  setFLNLastViewed(grade: string, day: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/user/fln-last-viewed`, { grade, day });
  }
} 