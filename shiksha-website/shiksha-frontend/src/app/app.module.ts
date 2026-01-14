import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpClientModule,
} from '@angular/common/http';
import { HttpConfigInterceptor } from './core/interceptors/http-config.interceptor';
import { NgxSpinnerModule } from 'ngx-spinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  TranslateLoader,
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import { HttpLoaderFactory } from './shared/utility/common.util';
import { LanguageSwitcherComponent } from './shared/components/language-switcher/language-switcher.component';
import { ToastrModule } from 'ngx-toastr';
import { DatePipe } from '@angular/common';
import { NgIdleModule } from '@ng-idle/core';
import { DeleteDetailComponent } from './shared/components/delete-detail/delete-detail.component';
import { ReactiveFormsModule } from '@angular/forms';


// Material
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

// Components
import { BaselineSurveyComponent } from './shared/components/baseline-survey/baseline-survey.component';

// Services
import { BaselineSurveyDialogService } from './core/services/baseline-survey-dialog.service';

@NgModule({
  declarations: [AppComponent,BaselineSurveyComponent,],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    NgxSpinnerModule,
    HttpClientModule,
    ReactiveFormsModule,
// Material
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,

    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    LanguageSwitcherComponent,
    ToastrModule.forRoot({
      timeOut: 5000,
      positionClass: 'toast-bottom-right',
    }),
    NgIdleModule.forRoot(),
    DeleteDetailComponent
  ],
  providers: [
    { 
      provide:HTTP_INTERCEPTORS,
      useClass:HttpConfigInterceptor,
      multi:true
    },
    DatePipe,
    BaselineSurveyDialogService

  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
})
export class AppModule {
  /**
   * Class constructor
   * @param translateService 
   */
  constructor(private translateService: TranslateService) {
    const data: string = localStorage.getItem('userData') ?? '';
    if(data){
      const loggedInUser = JSON.parse(data);
      if (loggedInUser?.preferredLanguage) {
        this.translateService.use(loggedInUser.preferredLanguage);
      }
    }
  }
}
