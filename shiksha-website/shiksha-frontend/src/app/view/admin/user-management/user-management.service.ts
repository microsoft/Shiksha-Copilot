import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRestService } from 'src/app/core/services/base-rest.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService extends BaseRestService {

  userRoleDropdownOptions: any[] = [{name:'Standard', value:'standard'}, {name:'Power', value:'power'}];
  baseUrl = environment.apiUrl;

  constructor(http: HttpClient) {
    super(http);
    this.setUri('user');
  }

  editUserDetails(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/user/${id}`, data);
  }

  getSchoolList(includeDeleted:boolean,filters?:any) : Observable<any>{
    let params = new HttpParams()
      if(includeDeleted){
        params = params.append('includeDeleted',1);
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
      }
    return this.http.get(`${this.baseUrl}/school/list?limit=999`, { params: params });
  }

  
  
  bulkUpload(formdata:any):Observable<any>{   
    return this.http.post(`${this.baseUrl}/user/bulk-upload`,formdata);
  }

  getUsersOfSchool(schoolId:string):Observable<any>{
    let params = new HttpParams()
    .set('filter[school]',schoolId);
    return this.http.get(`${this.baseUrl}/user/list`, { params: params });
  }

}
