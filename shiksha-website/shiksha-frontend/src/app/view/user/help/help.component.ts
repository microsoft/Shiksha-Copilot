import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UtilityService } from 'src/app/core/services/utility.service';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class HelpComponent {
  videos = [
    {
      title: 'User Registration',
      link: this.utilityService.trustUrl('https://youtu.be/qsGd7vCfceo'),
    },
    {
      title: 'Content Generation',
      link: this.utilityService.trustUrl('https://youtu.be/hgeW856iFt4'),
    },
    {
      title: 'Learning Outcomes',
      link: this.utilityService.trustUrl('https://youtu.be/e0mzHDjPhjQ'),
    },
    {
      title: 'Lesson Resources',
      link: this.utilityService.trustUrl('https://youtu.be/s7bLeyHY75E'),
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
      link:this.utilityService.trustUrl('https://youtu.be/J9y6GOj-6CQ')
    }
  ];

  /**
   * Class constructor
   * @param utilityService UtilityService
   */
  constructor(private utilityService: UtilityService) {}
}
