import { HttpClient} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable} from 'rxjs';
import { BaseRestService } from 'src/app/core/services/base-rest.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ShikshanService extends BaseRestService {

  userRoleDropdownOptions: any[] = [{name:'Admin', value:'admin'}, {name:'Manager', value:'manager'}];
  baseUrl = environment.apiUrl;

  constructor(http: HttpClient) {
    super(http);
    this.setUri('admin');
  }

  editUserDetails(id: string, data: any): Observable<any> {
    const updatedData = { ...data, _id: id };
    return this.http.put(`${this.baseUrl}/admin/update`, updatedData);
  }


  
  bulkUpload(formdata:any):Observable<any>{   
    return this.http.post(`${this.baseUrl}/admin/bulk-upload`,formdata);
  }

  
}
