import { Component, HostListener, effect } from '@angular/core';
import { SidebarService } from '../sidebar/sidebar.service';
import { UtilityService } from 'src/app/core/services/utility.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {

  isMenuOpen = false;

  showLogoutConfirm!: boolean;

  /**
   * Class constructor
   * @param sidebarService 
   * @param utilityService 
   */
  constructor(
    public sidebarService: SidebarService,
    public utilityService: UtilityService
  ) {

    effect(()=>{
      if(!this.sidebarService.headerOptionShow()){
        this.isMenuOpen = false
      }
    })
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if(this.isMenuOpen){
      this.sidebarService.headerOptionShow.set(true)
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.relative')) {
      this.isMenuOpen = false;
    }
  }

  openSidebar() {
    this.sidebarService.sidebarOpen.set(true);
  }

  openModalForLogoutConfirm(){
    this.showLogoutConfirm = true;
  }

  closeModal(value: string) {
    if (value === 'logout') {
      this.utilityService.logout();      
    }
    this.showLogoutConfirm = false;
  }
}
