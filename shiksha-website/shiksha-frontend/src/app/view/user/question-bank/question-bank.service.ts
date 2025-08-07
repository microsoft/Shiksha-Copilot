import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BaseRestService } from 'src/app/core/services/base-rest.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class QuestionBankService extends BaseRestService {
  baseUrl: string;

  /**
   * Class constructor
   * @param http HttpClient
   */
  constructor(http: HttpClient) {
    super(http);
    this.setUri('question-bank');
    this.baseUrl = environment.apiUrl;
  }

  /**
   * Function to get chapter by semester
   * @param filters
   * @returns
   */
  getChaptersBySem(filters?: { [key: string]: any }) {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) {
          if (key === 'subject') {
            params = params.set(`filter[${key}]`, JSON.stringify(filters[key]));
          } else {
            params = params.set(`filter[${key}]`, filters[key]);
          }
        }
      });
    }

    return this.http.get(`${this.baseUrl}/chapter/get-by-sem`, { params });
  }

  /**
   * Function to get all question banks
   * @param filters
   * @param search
   * @returns
   */
  getAllQuestionBanks(filters?: { [key: string]: any }, search?: any) {
    let params = new HttpParams().set('page', '1').set('limit', '999');
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) {
          if (key === 'semester') {
            params = params.set(`filter[${key}]`, JSON.stringify(filters[key]));
          } else if (key === 'search') {
            params = params.set('search', filters[key]);
          } else {
            params = params.set(`filter[${key}]`, filters[key]);
          }
        }
      });
    }

    return this.get('list', params);
  }

  /**
   * Function to get question bank by id
   * @param id
   * @returns
   */
  getQuestionBankDetails(id: any) {
    return this.get(id);
  }

  /**
   * Function to generate question bank template
   * @param data
   * @returns
   */
  generateQuestionBankTemplate(data: any): Observable<any> {
    return this.post('generate-template', data);
  }

  /**
   * Function to generate question bank blue print
   * @param data
   * @returns
   */
  generateQuestionBankBluePrint(data: any): Observable<any> {
    return this.post('generate-blue-print', data);
  }

  /**
   * Function to generate question bank
   * @param data
   * @returns
   */
  generateQuestionBank(data: any) {
    return this.post('generate', data);
  }

  /**
   * Function to update question bank feedback
   * @param id
   * @param data
   * @returns
   */
  updateQuestionBankFeedback(id: any, data: any) {
    return this.patch(`feedback/${id}`, data);
  }
}
