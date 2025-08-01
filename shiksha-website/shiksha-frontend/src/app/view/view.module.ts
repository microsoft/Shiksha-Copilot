import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewComponent } from './view.component';
import { ViewRoutingModule } from './view-routing.module';
import { SidebarComponent } from '../layout/sidebar/sidebar.component';
import { ContentLayoutComponent } from '../layout/content-layout/content-layout.component';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../shared/components/language-switcher/language-switcher.component';
import { HeaderComponent } from '../layout/header/header.component';
import { DeleteDetailComponent } from '../shared/components/delete-detail/delete-detail.component';
import { ProfileImageComponent } from '../shared/components/profile-image/profile-image.component';

@NgModule({
  declarations: [
    SidebarComponent,
    HeaderComponent,
    ContentLayoutComponent,
    ViewComponent
  ],
  imports: [
    CommonModule,
    ViewRoutingModule,
    TranslateModule,
    LanguageSwitcherComponent,
    DeleteDetailComponent,
    ProfileImageComponent
  ]
})
export class ViewModule { }
