import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  showDeleteUserDialog: boolean = false;
  showBlukUploadDialog:boolean = false;
  showGettingLessonPlanLoader: boolean = false;
  showRenegenerateDialog:boolean = false;
  showUploadErrorDialog:boolean = false;
  showChatbotSampleDialog:boolean = false;
}
