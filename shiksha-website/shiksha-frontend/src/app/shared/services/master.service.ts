import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MasterService {
  baseurl: string;

  /**
   * Class constructor
   * @param http HttpClient
   */
  constructor(private http: HttpClient) {
    this.baseurl = environment.apiUrl;
  }

  /**
   * Function to get regions data
   * @returns 
   */
  getRegions(): Observable<any> {
    return this.http.get(`${this.baseurl}/regions/list?limit=999`);
  }

  /**
   * Function to get board data
   * @returns 
   */
  getBoards(): Observable<any> {
    return this.http.get(`${this.baseurl}/board/list?limit=999`);
  }

  /**
   * Function to get resource data
   * Temp mock response
   * @revamp
   * @returns 
   */
  getFacilities(): Observable<any> {
    return this.http.get(`${this.baseurl}/facility/list?limit=999`);
  }
}
