import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { UtilityService } from 'src/app/core/services/utility.service';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class HelpComponent {
  videos = [
    {
      title: 'User Registration',
      link: this.utilityService.trustUrl('https://youtu.be/qsGd7vCfceo'),
    },
    {
      title: 'Content Generation',
      link: this.utilityService.trustUrl('https://youtu.be/qlma8Ah08MY'),
    },
    {
      title: 'Learning Outcomes',
      link: this.utilityService.trustUrl('https://youtu.be/1pSDq3UMFk4'),
    },
    {
      title: 'Lesson Resources',
      link: this.utilityService.trustUrl('https://youtu.be/GgRNcouN7GU'),
    },
    {
      title: 'My Schedules',
      link: this.utilityService.trustUrl('https://youtu.be/NoUajPGaoTE'),
    },
    {
      title: 'Dashboard Overview',
      link: this.utilityService.trustUrl('https://youtu.be/cCSbQAAW3vo'),
    },
    {
      title: 'Chatbot Assistance',
      link: this.utilityService.trustUrl('https://youtu.be/pVsWGb04Rrs'),
    },
    {
      title: 'Lesson Plan Regeneration',
      link: this.utilityService.trustUrl('https://youtu.be/-v0IobwLfZs'),
    },
    {
      title: 'Question Paper Generation',
      link:this.utilityService.trustUrl('https://youtu.be/CS7hr4j4w6Y')
    }
  ];

  /**
   * Class constructor
   * @param utilityService UtilityService
   */
  constructor(private utilityService: UtilityService) {}
}
