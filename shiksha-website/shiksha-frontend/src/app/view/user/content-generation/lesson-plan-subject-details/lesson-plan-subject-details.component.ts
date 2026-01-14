import { Component, Input } from '@angular/core';
import { UtilityService } from 'src/app/core/services/utility.service';

@Component({
  selector: 'app-lesson-plan-subject-details',
  templateUrl: './lesson-plan-subject-details.component.html',
  styleUrls: ['./lesson-plan-subject-details.component.scss'],
})
export class LessonPlanSubjectDetailsComponent {
  @Input() subjectDetails: any;

  constructor(public utilityService: UtilityService) {}
}
