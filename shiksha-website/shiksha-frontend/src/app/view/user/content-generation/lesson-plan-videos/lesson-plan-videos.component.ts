import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-lesson-plan-videos',
  templateUrl: './lesson-plan-videos.component.html',
  styleUrls: ['./lesson-plan-videos.component.scss'],
})
export class LessonPlanVideosComponent {
  @Input() videoUrls: { title: string; link: string }[] = [];

  @Output() selectedTitle: EventEmitter<string> = new EventEmitter<string>();

  updateTitle(title: any) {
    this.selectedTitle.emit(title);
  }
}
