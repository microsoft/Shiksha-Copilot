import { Component, Input } from '@angular/core';
import { CheckListExportService } from 'src/app/shared/services/checklist-export.service';
import { ChecklistPdfExportService } from 'src/app/shared/services/checklist-pdf-export.service';
import { DocumentExportService } from 'src/app/shared/services/document-export.service';
import { ResourcePptGeneratorService } from 'src/app/shared/services/resource-ppt-generator.service';

@Component({
  selector: 'app-lesson-plan-documents',
  templateUrl: './lesson-plan-documents.component.html',
  styleUrls: ['./lesson-plan-documents.component.scss'],
})
export class LessonPlanDocumentsComponent {
  @Input() docTypeValues: any[] = [];

  @Input() mode: any;

  @Input() isLesson: any;

  @Input() planDetails: any;

  @Input() sections: any[] = [];

  constructor(
    private documentExportService: DocumentExportService,
    private checklistPdfExportService: ChecklistPdfExportService,
    private resourcePptxService: ResourcePptGeneratorService,
    private checkListExportService: CheckListExportService
  ) {}

  downloadDocument(downloadType: any) {
    if (this.mode !== 'view') {
      return;
    }

    let headerData;

    if (this.isLesson) {
      headerData = { ...this.planDetails?.lesson?.chapter };
      headerData.subjects = this.planDetails?.lesson?.subjects;
      headerData.subTopics = this.planDetails?.lesson?.subTopics;
      headerData.class = this.planDetails?.lesson?.class;
      const fileName = `${headerData?.subjects?.name}${
        headerData?.subjects?.sem ? '_' : ''
      }${headerData?.subjects?.sem ? headerData?.subjects?.sem : ''}_${
        headerData?.topics
      }_lesson_plan`;
      const downloadContent = this.sections.filter(
        (e: any) => e.id !== 'section_checklist'
      );
      this.downloader(downloadType, downloadContent, headerData, fileName);
    } else {
      headerData = { ...this.planDetails?.resource?.chapter };
      headerData.subjects = this.planDetails?.resource?.subjects;
      headerData.subTopics = this.planDetails?.resource?.subTopics;
      headerData.class = this.planDetails?.resource?.class;
      let lo = this.planDetails?.resource?.learningOutcomes
        .map((item: any) => `- ${item}`)
        .join('\n');

      const downloadContent = [
        {
          id: 'learning_outcome',
          title: 'Learning Outcomes',
          content: lo,
          outputFormat: 'plain_text',
        },
        ...this.sections,
      ];

      const fileName = `${headerData?.subjects?.name}_${headerData?.subjects?.sem}_${headerData?.topics}_lesson_resource`;

      this.downloader(downloadType, downloadContent, headerData, fileName);
    }
  }

  downloader(downloadType: any, data: any, header: any, fileName: any) {
    switch (downloadType) {
      case 'planDoc':
        this.documentExportService.downloadDoc(data, header, fileName);
        break;

      case 'planPPT':
        this.resourcePptxService.generatePpt(data, header, fileName);
        break;

      case 'planChecklist':
        this.checkListDownloader(header, 'doc');
        break;

      case 'planChecklistPdf':
        this.checkListDownloader(header, 'pdf');
        break;

      default:
        break;
    }
  }

  checkListDownloader(header: any, type: any) {
    let flName = `${header?.subjects?.name}_${header?.topics}_checklist`;
    const checkListSection = this.sections.filter(
      (e) => e.id === 'section_checklist'
    );
    let checklistData: any[] = [];
    if (checkListSection.length === 1) {
      checklistData = checkListSection[0].content;
    }
    const userData: string = localStorage.getItem('userData') ?? '';
    const loggedInUser = JSON.parse(userData);
    header.schoolName = loggedInUser?.school?.name;
    header.teacherName = loggedInUser?.name;
    header.reportGeneratedDate = this.planDetails?.createdAt;
    if (type === 'doc') {
      this.checkListExportService.generateChecklist(
        header,
        this.planDetails.learningOutcomes,
        checklistData,
        flName
      );
    } else {
      this.checklistPdfExportService.generateChecklistPDF(
        header,
        this.planDetails?.learningOutcomes,
        checklistData,
        flName
      );
    }
  }
}
