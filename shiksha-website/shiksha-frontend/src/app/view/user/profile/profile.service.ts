import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BaseRestService } from 'src/app/core/services/base-rest.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProfileService extends BaseRestService {
  baseUrl = environment.apiUrl;
  
  /**
   * Class constructor
   * @param http 
   */
  constructor(http: HttpClient) {
    super(http);
    this.setUri('user');
  }

  /**
   * Function to get profile info
   * @param id 
   * @returns 
   */
  getProfileInfo(id: any): Observable<any>  {
    return this.get(`get-profile/${id}`);
  }

  /**
   * Function to get school info
   * @param id 
   * @returns 
   */
  getSchoolInfo(id: any) {
    return this.http.get(`${this.baseUrl}/school/${id}`);
  }

  /**
   * Function to update profile
   * @param id 
   * @param data 
   * @returns 
   */
  updateProfile(data:any):Observable<any>{
    return this.put(`set-profile`,data);
  }

  /**
   * Function to get classes by board
   * @param schoolId 
   * @returns 
   */
  getClassesByBoard(schoolId:any):Observable<any>{
    return this.http.get(`${environment.apiUrl}/class/group-by-board/${schoolId}`)
  }

  updatePreferedLanguage(language:any):Observable<any>{
    return this.patch('update-language',{preferredLanguage:language})
  }

  /**
  * Function to upload profile pic
  * @param image 
  * @returns 
  */
   uploadProfileImage(image:any):Observable<any>{
    const formData = new FormData();
    formData.append('file',image)
    return this.post('upload-profile-image',formData)
  }

  removeProfileImage():Observable<any>{
    return this.post('remove-profile-image',{})
  }
}

