import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from 'src/environments/environment';

interface TeacherResponse {
  success: boolean;
  data: {
    results: any[];
    totalItems: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
    baseUrl:any;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { 
        this.baseUrl = environment.apiUrl;
    
  }

  getTeachers(zone?: string, district?: string, page = 1, limit = 10, searchTerm = ''): Observable<TeacherResponse> {
    let params = new HttpParams();
    
    // Send zone/district parameters if explicitly provided for filtering
    if (zone) {
      params = params.append('zone', zone);
    }
    if (district) {
      params = params.append('district', district);
    }
    
    // Add pagination parameters
    params = params.append('page', page.toString());
    params = params.append('limit', limit.toString());
    
    // Add search term parameter - this will search across name, phone, zone, and district
    if (searchTerm && searchTerm.trim()) {
      params = params.append('search', searchTerm.trim());
    }
    
    // Use the correct role values for teachers: 'standard' and 'power'
    // The backend expects role to be an array, so we need to send both values
    params = params.append('role', 'standard');
    params = params.append('role', 'power');
    
    console.log('TeacherService.getTeachers - API call with params:', {
      zone, district, page, limit, searchTerm,
      fullParams: params.toString()
    });
    
    return this.http.get<TeacherResponse>(`${this.baseUrl}/user/list`, { params });
  }
} 