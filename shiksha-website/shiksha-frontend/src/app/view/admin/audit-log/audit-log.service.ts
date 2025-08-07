import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRestService } from 'src/app/core/services/base-rest.service';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService extends BaseRestService {

  /**
   * Class constructor
   * @param http HttpClient
   */
  constructor(http: HttpClient) {
    super(http);
    this.setUri('audit');
  }

  /**
   * Function to get audit logs
   * @param page 
   * @param limit 
   * @returns 
   */
  getAuditLogs(page: number, limit: number): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.get<any>('log', params);
  }
}
