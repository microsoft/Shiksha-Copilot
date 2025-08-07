import { Injectable } from '@angular/core';
import { BaseRestService } from '../core/services/base-rest.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment'
import { applicationUsers } from '../shared/utility/enum.util';

@Injectable({
  providedIn: 'root',
})
export class SignInService extends BaseRestService {
  baseUrl = environment.apiUrl;
  params = new HttpParams();
  loggedInUserType!:applicationUsers;

  /**
   * Class constructor
   * @param http 
   */
  constructor(http: HttpClient) {
    super(http);
    this.setUri('auth');

    const hostname = window.location.hostname;
    
    if (hostname.startsWith('sikshana') || hostname.startsWith('shikshacopilot')) {
      this.params = this.params.set('type', '0');
      this.loggedInUserType = applicationUsers.TEACHER;
    } else if (hostname.startsWith('admin')) {
      this.loggedInUserType = applicationUsers.ADMIN;
      this.params = this.params.set('type', '1');
    } else if(hostname.startsWith('localhost')){
      this.loggedInUserType = applicationUsers.TEACHER;
      this.params = this.params.set('type', '0');
    }
  }

  /**
   * send the phone  number to validate
   * @param mobile_number
   * @returns
   */
  validateMobileNumber(reqBody:any) {
    return this.post(`get-otp?${this.params}`,reqBody);
  }

  /**
   * validate the otp values
   * @param otpval
   * @param phoneNumber
   * @returns
   */
  validateOTP(otpval: string, phoneNumber: string) {
    return this.post(`validate-otp?${this.params}`, {
      phone: phoneNumber,
      otp: otpval,
    });
  }

  /**
   * Auth me
   * @returns 
   */
  authMe(){
    return this.get('me');
  }
}
