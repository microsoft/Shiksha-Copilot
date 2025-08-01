import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRestService } from 'src/app/core/services/base-rest.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StaffUserCommonService extends BaseRestService {

  baseUrl = environment.apiUrl;

  addUser(data: any, role: string): Observable<any> { 
    this.setURI(role);
    return this.post('create', data);
  }

  getUserDetails(id: string, role: string): Observable<any> {
    this.setURI(role);
    return this.get(`${id}`);
  }

  getUsers(from: string | undefined, page?: number, limit?: number,filters?: { [key: string]: any }, search?: string): Observable<any> { 
    let params = new HttpParams()
    
    // Add pagination parameters if they are provided
    if (page !== undefined && limit !== undefined) {
      params = params.set('page', page.toString()).set('limit', limit.toString());
    }

    if (filters) {
      
      Object.keys(filters).forEach(key => {
        if(filters[key] || filters[key] === 0){
          
          if(key === 'search'){
            params = params.set(`${key}`, filters[key]);

          }
          else if(key === 'includeDeleted'){
            
            params = params.set(`${key}`, filters[key]);
          }
          else{
            params = params.set(`filter[${key}]`, filters[key]);

          }
        }
      });
    }

    

    if (search) {
      params = params.set('search', search);
    }
    
    if (from === 'user') {
      return this.http.get<any>(`${this.baseUrl}/user/list`, { params: params });
    } else {
      return this.http.get<any>(`${this.baseUrl}/admin/list`, { params: params });
    } 
    
  }

  disableUser(id: string, role: string | undefined): Observable<any> {
    this.setURI(role);
    if(role === 'user'){
      return this.put(`deactivate/${id}`,{});
    }
    else{
      return this.delete(`${id}`);
    }
  }

  activateUser(id:any, role: string | undefined){
    this.setURI(role);
    return this.put(`activate/${id}`,{});
  }

  bulkUpload(formdata: any, role: string | undefined): Observable<any>{   
    if (role === 'user') {
      return this.http.post(`${this.baseUrl}/user/bulk-upload`,formdata);
    } else {
      return this.http.post(`${this.baseUrl}/admin/bulk-upload`,formdata);
    }
  }

  exportTeacher(filters?: { [key: string]: any }, search?: string): Observable<any> { 
    let params = new HttpParams()
    
    if (filters) {
      
      Object.keys(filters).forEach(key => {
        if(filters[key] || filters[key] === 0){
          
          if(key === 'search'){
            params = params.set(`${key}`, filters[key]);

          }
          else if(key === 'includeDeleted'){
            
            params = params.set(`${key}`, filters[key]);
          }
          else{
            params = params.set(`filter[${key}]`, filters[key]);

          }
        }
      });
    }

    if (search) {
      params = params.set('search', search);
    }
    
      return this.http.get<any>(`${this.baseUrl}/user/export`, { params: params } );
  }

  setURI(role:string | undefined) {
    this.setUri(role);
  }

}
