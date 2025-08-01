import { Injectable, inject, signal } from '@angular/core';
import { UtilityService } from 'src/app/core/services/utility.service';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  util = inject(UtilityService)
  profileImg = signal(this.util.loggedInUserData?.profileImage || '');
  sidebarOpen = signal(false);
  headerOptionShow = signal(false);
}
