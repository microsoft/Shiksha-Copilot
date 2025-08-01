import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { UtilityService } from 'src/app/core/services/utility.service';

@Component({
  selector: 'app-profile-image',
  templateUrl: './profile-image.component.html',
  styleUrls: ['./profile-image.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ProfileImageComponent {
  @Input() profileImage: any;

  @Input() size: any;

  constructor(private utilityService: UtilityService) {}

  get firstCharacter(): string {
    return this.utilityService.loggedInUserData?.name
      ? this.utilityService.loggedInUserData?.name.charAt(0).toUpperCase()
      : '';
  }
}
