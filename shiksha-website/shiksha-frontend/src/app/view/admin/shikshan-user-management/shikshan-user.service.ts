import { HttpClient} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable} from 'rxjs';
import { BaseRestService } from 'src/app/core/services/base-rest.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ShikshanService extends BaseRestService {

  userRoleDropdownOptions = [
    { name: 'Admin', value: 'admin' },
    { name: 'Manager', value: 'manager' }
  ];
  baseUrl = environment.apiUrl;

  constructor(http: HttpClient) {
    super(http);
    this.setUri('admin');
  }

  editUserDetails(id: string, data: any): Observable<any> {
    const updatedData = {
      _id: id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      role: Array.isArray(data.role) ? data.role : [data.role],
      isDeleted: data.isDeleted,
      state: data.state,
      zones: data.zones,
      districts: data.districts
    };
    return this.put('update', updatedData);
  }

  createUser(data: any): Observable<any> {
    const createData = {
      ...data,
      role: Array.isArray(data.role) ? data.role : [data.role]
    };
    return this.post('create', createData);
  }

  bulkUpload(formdata:any):Observable<any>{   
    return this.post('bulk-upload', formdata);
  }

}
