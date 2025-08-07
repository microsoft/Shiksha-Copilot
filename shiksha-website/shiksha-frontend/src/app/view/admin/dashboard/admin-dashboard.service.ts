import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseRestService } from 'src/app/core/services/base-rest.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService extends BaseRestService{
  baseUrl = environment.apiUrl;

  /**
   * class constructor
   * @param http 
   */
  constructor(http: HttpClient) {
    super(http);
    this.setUri('admin');
  }
  
  getData(isLesson: boolean, schoolId?: any, filters?: any) {
    let params = new HttpParams().set('isLesson', isLesson.toString());
  
    if (schoolId) {
      params = params.set('schoolId', schoolId);
    } else if (filters) {
      if (filters.state) {
        params = params.set('state', filters.state);
      }
      if (filters.zone) {
        params = params.set('zone', filters.zone);
      }
      if (filters.district) {
        params = params.set('district', filters.district);
      }
      if (filters.block) {
        params = params.set('block', filters.block);
      }
      if (filters.schoolId) {
        params = params.set('schoolId', filters.schoolId);
      }
      if (filters.fromDate) {
        params = params.set('fromDate', filters.fromDate);
      }
      if (filters.toDate) {
        params = params.set('toDate', filters.toDate);
      }
    }
  
    return this.http.get(`${this.baseUrl}/admin/dashboard`, { params });
  }
  

}
