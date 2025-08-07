import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { CookieService } from 'ngx-cookie-service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SecureCookieService {
  private secretKey = environment.CRYPTO_SECRET;

  constructor(private cookieService: CookieService) {}

  setObjectCookie(name: string, value: object) {
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 3); 
    const serializedValue = JSON.stringify(value);
    const encrypted = CryptoJS.AES.encrypt(serializedValue, this.secretKey).toString();
    this.cookieService.set(name, encrypted,{ expires:expirationDate ,path:'/', secure:true, sameSite:'Strict' });
  }

  getObjectCookie(name: string): object | null {
    const encrypted = this.cookieService.get(name);
    if (encrypted) {
      const bytes = CryptoJS.AES.decrypt(encrypted, this.secretKey);
      const serializedValue = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(serializedValue);
    }
    return null;
  }

  deleteCookie(name: string) {
    this.cookieService.delete(name);
  }
}
