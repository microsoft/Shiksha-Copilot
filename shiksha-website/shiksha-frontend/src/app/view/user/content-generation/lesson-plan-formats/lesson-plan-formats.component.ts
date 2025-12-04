import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-lesson-plan-formats',
  templateUrl: './lesson-plan-formats.component.html',
  styleUrls: ['./lesson-plan-formats.component.scss'],
})
export class LessonPlanFormatsComponent {
  @Input() sections: any[] = [];

  @Input() editMode: any[] = [];

  @Output() unsavedChanges: EventEmitter<boolean> = new EventEmitter<boolean>();

  setEditMode(i: any) {
    this.editMode[i] = true;
    this.unsavedChanges.emit(true);
  }

  saveEdited(i: any) {
    this.editMode[i] = false;
  }

  trackByIndex(index: number, _item: any): number {
    return index;
  }
}
