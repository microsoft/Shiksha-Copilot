import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRestService } from 'src/app/core/services/base-rest.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService extends BaseRestService {
  baseUrl = environment.apiUrl;

  /**
   * class constructor
   * @param http 
   */
  constructor(http: HttpClient) {
    super(http);
    this.setUri('schedule');
  }

  /**
   * Function to get recent lesson plan
   * @returns 
   */
  getRecentLessonPlan(): Observable<any> {
    let params = new HttpParams()
    .set('limit', '999')
    .set('sortBy','createdAt')
    .set('filter[type]','all')
    .set('filter[isCompleted]','true')
    
    const options = {
        params: params
      };
    return this.http.get(`${this.baseUrl}/teacher-lesson-plan/list`, options);
  }

  /**
   * Function to get schedule data
   * @param date 
   * @returns 
   */
  getScheduleData(date:any):Observable<any>{
    return this.get(`my-schedules?date=${date}`)
  }

  /**
   * Function to get analytics data
   * @param filterParam 
   * @returns 
   */
  getChartData(filterParam:any):Observable<any>{
    return this.http.get(`${this.baseUrl}/teacher-lesson-plan/monthly-count?filter=${filterParam}`)
  }
}
