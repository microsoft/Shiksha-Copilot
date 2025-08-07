import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Carousel } from 'src/app/shared/interfaces/carousel';
import { scaleAnimation } from 'src/app/shared/utility/animations.util';
import { images } from 'src/app/shared/utility/carousel.util';
import { SignInService } from '../sign-in.service';
import { Router } from '@angular/router';
import { UtilityService } from 'src/app/core/services/utility.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { SidebarService } from 'src/app/layout/sidebar/sidebar.service';
import { NgOtpInputComponent, NgOtpInputConfig } from 'ng-otp-input';
import { TranslateService } from '@ngx-translate/core';
import { SecureCookieService } from 'src/app/shared/services/cookie.service';
import { applicationUsers } from 'src/app/shared/utility/enum.util';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
  animations: [scaleAnimation],
})
export class SignInComponent implements OnInit,AfterViewInit, OnDestroy {
  selectedSlide = 0; //track the current slide
  sliderInterval: any;
  phoneNumber!: string; //input variable
  numberErrorMsg: string | null = null;
  modalStatus = false; //track the modal status
  otpTimer!: number;
  timeInterval: any;
  showResendOTP: boolean = false;
  otpValue: string = '';
  invalidOtp=false;
  images: Carousel[] = images; //utility from the utility folder

  rememberMe= false;
  storedUserInfo:any;
  otpTriggered = false;

  otpInputConfig: NgOtpInputConfig = {
    length: 4,
    allowNumbersOnly:true,
    isPasswordInput:true,
    inputStyles:{
      'width': '35px',
      'height': '35px',
      'font-size':'20px',
      'text-align': 'center',
      'border':'1px solid #212121',
      'margin':'0 5px'
    }
  };

  @ViewChild('ngotp') ngOtp!: NgOtpInputComponent;

  @ViewChild('phone') phone!: ElementRef;

  applicationUsersType = applicationUsers;

  constructor(
    public service: SignInService,
    private router: Router,
    private utility: UtilityService,
    private authService:AuthorizationService,
    private sidebarService:SidebarService,
    private translateService: TranslateService,
    private secureCookieService:SecureCookieService
  ) {}

  /**
   * autoslide enabled
   */
  ngOnInit(): void {
    this.autoSlide();
    this.getCookies();
    if(this.authService.isLoggedIn()){
      const userData = this.utility.loggedInUserData;
      if (
        userData.role.includes('admin') ||
        userData.role.includes('manager')
      ) {
        this.router.navigate(['/admin']);
      }  else if (!userData.isProfileCompleted) {
        this.router.navigate(['/user/profile']);
      } else {
        this.router.navigate(['/user']);
      }

    }

  }

  ngAfterViewInit(): void {
    this.phone.nativeElement.focus();
  }

  getCookies(){
    this.storedUserInfo = this.secureCookieService.getObjectCookie('userInfo') || null;
    if(this.storedUserInfo){
      this.rememberMe = true;
      this.phoneNumber = this.storedUserInfo.phone;
    }
  }

  /**
   * get the otp value on every input press
   * @param value
   */
  handeOtpChange(value: any): void {
    //handle otp chnage
    this.otpValue = value;
    this.invalidOtp=false;
  }

  /**
   * track the otp whether the otp is filled or not
   * @param value
   */
  handleFillEvent(value: string): void {
    this.otpValue = value;
  }

  /**
   * clear the otp values and set the status to success
   */
  clearOTPFiled(): void {
    this.ngOtp.setValue(null);
    this.invalidOtp=false;
  }

  /**
   * update the current slide element
   * @param index
   */
  selectImage(index: number) {
    this.selectedSlide = index;
  }

  /**
   * Automatically advances the slider at a fixed interval.
   * If the slider reaches the last image, it resets to the first image.
   */
  autoSlide() {
    this.sliderInterval = setInterval(() => {
      this.onNextClick();
    }, 4000);
  }

  /**
   * advance the slider to the previous person
   */
  onPrevClick() {
    if (this.selectedSlide == 0) {
      this.selectedSlide = this.images.length - 1;
    } else {
      this.selectedSlide--;
    }
  }

  /**
   * advance the slider to the next person
   */
  onNextClick() {
    if (this.selectedSlide === this.images.length - 1) {
      this.selectedSlide = 0;
    } else {
      this.selectedSlide++;
    }
  }

  /**
   * prevent the user to enter more than 10 digit of mobile number
   * @param event
   */
  checkLimit(event: KeyboardEvent) {
    let input = event.target as HTMLInputElement;
    const inputValue = input.value;
    if (this.phoneNumber) {
      if (inputValue.length === 10) {
        event.preventDefault();
      }
    }
  }

  /**
   * validate the mobile number and on success render the dialogue
   * @returns
   */
  onVerifyPhoneNumber() {
    //check the phone number exist or not before submitting
    if (!this.phoneNumber) {
      this.numberErrorMsg = 'Phone Number is required';
      return;
    }
    let phoneNumberString = this.phoneNumber.toString();
    const numberRegex:RegExp = this.utility.regexPattern.phoneRegex;
    if (
      phoneNumberString.length < 10 ||
      numberRegex.exec(phoneNumberString) === null
    ) {
      this.numberErrorMsg = 'Invalid phone number.';
    } else {
      this.numberErrorMsg = null;
      const reqBody = {
        phone:this.phoneNumber,
        rememberMe:this.rememberMe
      }
     this.getOtp(reqBody);
      
    }
  }

  getOtp(reqBody:any){
    this.service.validateMobileNumber(reqBody).subscribe({
      next: (res: any) => {
        this.otpTriggered = res?.data?.otpTriggered;
        this.modalStatus = true;
        this.showResendOTP = false;
        this.clearOTPFiled();
        // this.startTimer();
        this.utility.showSuccess(this.otpTriggered ? 'Please enter the PIN sent to your phone number to continue' : 'Please enter your access PIN');
        if(this.storedUserInfo && this.phoneNumber === this.storedUserInfo?.phone){
          this.ngOtp.setValue(this.storedUserInfo.apin)
        }
      },
      error: (err: any) => {
        this.utility.handleError(err);
      },
    });
  }

  forgotPin(){
    const reqBody = {
      phone:this.phoneNumber,
      rememberMe:this.rememberMe,
      forgotPassword:true
    }
    this.clearOTPFiled();
    this.secureCookieService.deleteCookie("userInfo");
    this.storedUserInfo=null;
   this.getOtp(reqBody);
  }

  /**
   * update the loader and navigate the user on correct otp
   */
  onVerifyOTP() {
    if (this.otpValue) {
      this.service
        .validateOTP(this.otpValue, this.phoneNumber.toString())
        .subscribe({
          next: (res: any) => {
            this.invalidOtp = false;
            this.utility.showSuccess("You've successfully logged in.");
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('userData', JSON.stringify(res.data.user));
            const profileUrl = res?.data?.user?.profileImage || ''
            this.sidebarService.profileImg.set(profileUrl);

            if (res?.data.user?.preferredLanguage) {
                this.translateService.use(res.data.user.preferredLanguage);
            }

            if(this.rememberMe){
              const userInfo = {
                phone:this.phoneNumber,
                apin:this.otpValue
              }
              this.secureCookieService.setObjectCookie("userInfo",userInfo);
            }else{
              this.secureCookieService.deleteCookie("userInfo");
            }

            if (res.data.user.role.includes('admin') || res.data.user.role.includes('manager')) {
              this.router.navigate(['/admin']);
            } else if (!res.data.user.isProfileCompleted) {
              this.router.navigate(['/user/profile']);
            } else {
              this.router.navigate(['/user']);
            }
          },
          error: (err: any) => {
            this.invalidOtp = true;
            this.utility.handleError(err);
          },
        }); //api call
    }
  }

  /**
   * close the dialogue box
   */
  closeModal() {
    this.modalStatus = false;
    // this.stopTimer();
  }

  startTimer() {
    this.otpTimer = 60;
    this.timeInterval = setInterval(() => {
      if (this.otpTimer > 0) {
        this.otpTimer--;
      } else {
        // this.stopTimer();
        this.showResendOTP = true;
      }
    }, 1000);
  }

  stopTimer() {
    this.otpTimer = 60; //reset the timer
    clearInterval(this.timeInterval);
  }

  onResendOTP() {
    this.showResendOTP = false;
    // this.startTimer();
    this.clearOTPFiled();
    this.forgotPin();
  }

  clearErrorMsg() {
    this.numberErrorMsg = null;
  }

  /**
   * clean up the slider interval and timerInterval
   */
  ngOnDestroy(): void {
    // this.stopTimer();
    clearInterval(this.sliderInterval);
  }
}
