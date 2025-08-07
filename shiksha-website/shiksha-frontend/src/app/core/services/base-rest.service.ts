import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BaseRestService {

  /**
   * base url of the api
   */
  protected apiUrl:string;

  /**
   * uri of the url {module name}
   */
  protected apiUri:string;

  /**
   * Class constructor
   * @param http 
   */
  constructor(protected http:HttpClient) { 
    this.apiUrl = environment.apiUrl;
    this.apiUri = ''
  }

  /**
   * Method to make get request
   * @param url 
   * @param params 
   * @returns 
   */
  protected get<T>(url:string,params?:HttpParams):Observable<T>{
    return this.http.get<T>(`${this.getUrl()}${url}`,{params})
  }

  /**
   * Method to make post request
   * @param url 
   * @param body 
   * @returns 
   */
  protected post<T>(url:string,body:any):Observable<T>{
    return this.http.post<T>(`${this.getUrl()}${url}`,body)
  }

  /**
   * Method to make put request
   * @param url 
   * @param body 
   * @returns 
   */
  protected put<T>(url:string, body:any):Observable<T>{
    return this.http.put<T>(`${this.getUrl()}${url}`,body)
  }

  /**
   * Method to make patch request
   * @param url 
   * @param body 
   * @returns 
   */
  protected patch<T>(url:string,body:any):Observable<T>{
    return this.http.patch<T>(`${this.getUrl()}${url}`,body)
  }

  /**
   * Method to make delete request
   * @param url 
   * @returns 
   */
  protected delete<T>(url:string):Observable<T>{
    return this.http.delete<T>(`${this.getUrl()}${url}`);
  }

  /**
   * Method to set uri, when this class is extended use this method to set the uri or module name
   * @param uri 
   */
  protected setUri(uri:any){
    this.apiUri = uri
  }

  /**
   * Method to get base url attached with uri
   * @returns 
   */
  protected getUrl(){    
    let url = `${this.apiUrl}/${this.apiUri}/`
    return url
  }
}
