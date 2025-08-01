import { Component, OnDestroy } from '@angular/core';
import { SignInService } from './auth/sign-in.service';
import { UtilityService } from './core/services/utility.service';
import { Router } from '@angular/router';
import { AuthorizationService } from './core/services/authorization.service';
import { IdleService } from './shared/services/idle.service';
import { IDLE_START_THRESHOLD, IDLE_WARNING_THRESHOLD } from './shared/utility/constant.util';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  title = 'shiksha-frontend';

  showIdleWarning=false;

  idleTime = Math.round((IDLE_WARNING_THRESHOLD + IDLE_START_THRESHOLD)/60)

  /**
   * Class constructor
   * @param authService SignInService
   * @param utilityService UtilityService
   * @param router Router
   */
  constructor(
    private authService: SignInService,
    private utilityService: UtilityService,
    private router: Router,
    private authorizationService: AuthorizationService,
    private idleService:IdleService
  ) {}

  /**
   * Angular ngonint lifecycle hook
   */
  ngOnInit(): void {

    this.idleService.idleIndicator.
    subscribe({
      next:(val)=>{
        this.showIdleWarning=true
      }
    })

    if (this.authorizationService.isLoggedIn()) {
      this.updateUserData();
    }
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  handleBeforeUnload(event: BeforeUnloadEvent): void {
    console.log('User is about to close the tab or navigate away.');
    this.idleService.stopWatching()
  }

  closeModal(val:any){
    if(val!=='close'){
      this.idleService.startWatching()
    }
    this.showIdleWarning=false
  }

  /**
   * Method to update latest user data
   */
  updateUserData() {
    this.authService.authMe().subscribe({
      next: (res: any) => {
        localStorage.setItem('userData', JSON.stringify(res?.data));
      },
      error: (err: any) => {
        this.utilityService.handleError(err);
      },
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }
}
