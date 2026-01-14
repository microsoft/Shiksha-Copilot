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
   * Function to get states data
   * @returns 
   */
  getStates(): Observable<any> {
    return this.http.get(`${this.baseurl}/regions/states`);
  }

  /**
   * Function to get zones data for a state
   * @param state State name
   * @returns 
   */
  getZones(state: string): Observable<any> {
    return this.http.get(`${this.baseurl}/regions/zones?state=${state}`);
  }

  /**
   * Function to get districts data for a zone
   * @param zone Zone name
   * @returns 
   */
  getDistricts(zone: string): Observable<any> {
    return this.http.get(`${this.baseurl}/regions/districts?zone=${zone}`);
  }

  /**
   * Function to get taluks data for a district
   * @param district District name
   * @returns 
   */
  getTaluks(district: string): Observable<any> {
    return this.http.get(`${this.baseurl}/regions/taluks?district=${district}`);
  }

  /**
   * Function to get schools data for a taluk
   * @param taluk Taluk name
   * @returns 
   */
  getSchools(taluk: string): Observable<any> {
    return this.http.get(`${this.baseurl}/regions/schools?taluk=${taluk}`);
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
