import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CommonDropdownComponent } from '../common-dropdown/common-dropdown.component';
import { DropDownConfig } from '../../interfaces/dropdown.interface';
import { LANGUAGES } from '../../utility/constant.util';
import { DeleteDetailComponent } from '../delete-detail/delete-detail.component';
@Component({
  selector: 'app-language-switcher',
  templateUrl: './language-switcher.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, CommonDropdownComponent,DeleteDetailComponent],
})
export class LanguageSwitcherComponent implements AfterViewInit {
  @Output() languageChange: EventEmitter<string> = new EventEmitter<string>();

  @Input() preferedLanguage: any;

  @ViewChild('languageSwitcher') languageSwitcher: any;

  languageDropdownOptions: any[] = LANGUAGES;

  showLanguageSwitcher=false;

  selectedLanguage:any;

  languageSwitchConfig = {
    heading:this.translateService.instant('Switch Language'),
    confirmText:''
  }

  languageDropDownConfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select Preferred Language',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'value',
    clearableOff:true
  };

  /**
   * Class constructor
   * @param translateService 
   */
  constructor(private translateService:TranslateService) {}

  /**
   * ngafterviewinit hook used here to set the preferred language
   */
  ngAfterViewInit(): void {
    this.languageSwitcher.selectedItem = this.preferedLanguage;
  }

  /**
   * Function trigged on language change
   * @param lang 
   */
  changeLanguage(lang: any) {
    if(lang){
      this.selectedLanguage=lang
      this.languageSwitchConfig.confirmText=`${this.translateService.instant('Are you sure you want to switch the application language')}`
      this.showLanguageSwitcher=true;
    }
  }

  confirmSwitch(val:any){
    if(val === 'ok'){
      this.languageChange.emit(this.selectedLanguage);
    }else{
      this.languageSwitcher.selectedItem = this.preferedLanguage;
    }
    this.showLanguageSwitcher=false;
  }
}
