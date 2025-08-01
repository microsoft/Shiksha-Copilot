import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRestService } from 'src/app/core/services/base-rest.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContentActivityService extends BaseRestService {

  baseUrl = environment.apiUrl;

  /**
   * class constructor
   * @param http 
   */
  constructor(http: HttpClient) {
    super(http);
    this.setUri('admin');
  }

  getContentActivityData(page: number, limit: number, filters?: any, search?: string): Observable<any> {
    let params = new HttpParams().set('page', page.toString())
      .set('limit', limit.toString());
      
    if (search) {
      params = params.set('search', search);
    }
    if (filters) {
      if (filters.state) {
        params = params.set('filter[state]', filters.state);
      }
      if (filters.district) {
        params = params.set('filter[district]', filters.district);
      }
      if (filters.zone) {
        params = params.set('filter[zone]', filters.zone);
      }
      if (filters.block) {
        params = params.set('filter[block]', filters.block);
      }
      if (filters._id) {
        params = params.set('filter[schoolId]', filters._id);
      }
    }
    return this.get('get-content-activity', params);
  }

  getLessonPlanDetFrmContentActivity(id:any){
    return this.http.get(`${this.baseUrl}/master-lesson/activity/${id}`);
  }

  exportContentActivities(filters?: { [key: string]: any }, search?: string): Observable<any> {
    let params = new HttpParams()
      .set('includeDeleted', 1)

      if (filters) {
        Object.keys(filters).forEach(key => {
          if(filters[key]){
            
            if(key === 'search'){
              params = params.set(`${key}`, filters[key]);

            }else{
              params = params.set(`filter[${key}]`, filters[key]);

            }
          }
        });
      }

    return this.http.get<any>(`${this.baseUrl}/admin/content-activity/export`, { params: params });
  }
}

