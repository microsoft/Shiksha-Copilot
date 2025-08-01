import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRestService } from 'src/app/core/services/base-rest.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SchoolManagementService extends BaseRestService {
  baseurl: string;

  /**
   * class constructor
   * @param http HttpClient
   */
  constructor(http: HttpClient) {
    super(http);
    this.setUri('school');
  this.baseurl = environment.apiUrl;

  }


  /**
   * Function to get school list data
   * @returns 
   * @revamp
   */
  getSchoolList(page: number, limit: number, filters?: { [key: string]: any }, search?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('includeDeleted', 1);

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

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<any>(`${this.baseurl}/school/list`, { params: params });
  }

  /**
   * Function to get all school list
   * @returns 
   */
  getAllSchoolList():Observable<any>{
    return this.get('list?limit=999')
  }

  /**
   * Function to get school data
   * @param id 
   * @returns
   * @revamp
   */
  getSchoolData(id: any): Observable<any> {
    return this.http.get(`${this.baseurl}/school/${id}`);
  }

  /**
   * Function to create school
   * @param data 
   * @returns 
   */
  createSchool(data: any): Observable<any> {
    return this.post('create', data);
  }

  /**
   * Function to update school
   * @param data 
   * @param id 
   * @returns 
   */
  updateSchool(data: any, id: any): Observable<any> {
    return this.put(`update/${id}`, data);
  }
  
  bulkUpload(formdata:any):Observable<any>{   
    return this.http.post(`${this.baseurl}/school/bulk-upload`,formdata);
  }

  disableSchool(id:any){
    return this.put(`deactivate/${id}`,{});
  }

  activateSchool(id:any){
    return this.put(`activate/${id}`,{});
  }

  updateFacility(id:any,facility:any){
    return this.put(`facility/${id}`,facility);
  }

   
  exportSchoolList(filters?: { [key: string]: any }, search?: string): Observable<any> {
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
  
      return this.http.get<any>(`${this.baseurl}/school/export`, { params: params });
    }
}
