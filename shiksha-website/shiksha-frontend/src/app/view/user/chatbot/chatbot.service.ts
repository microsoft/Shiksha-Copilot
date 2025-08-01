import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRestService } from 'src/app/core/services/base-rest.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChatbotService extends BaseRestService {

  baseUrl = environment.apiUrl;

  /**
   * Class constructor
   * @param http HttpClient
   */
  constructor(http: HttpClient) {
    super(http);
    this.setUri('chat');
  }

  /**
   * Function to send message
   * @param messageObj 
   * @returns 
   */
  sendGeneralMessage(messageObj: any): Observable<any> {
    return this.post('message', messageObj);
  }

  sendIndexMessage(messageObj: any,recordId:any,chapterId:any): Observable<any> {
    return this.http.post(`${this.baseUrl}/lessonchat/message/${recordId}/${chapterId}`, messageObj);
  }


  /**
   * Function to get messages
   * @returns 
   */
  getGeneralMessages(): Observable<any> {
    return this.get('messages');
  }

  getIndexMessages(recordId:any, chapterId:any): Observable<any> {
    return this.http.get(`${this.baseUrl}/lessonchat/messages/${recordId}/${chapterId}`);
  }
}
