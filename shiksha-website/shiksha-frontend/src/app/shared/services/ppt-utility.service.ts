import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import PptxGenJS from 'pptxgenjs';
import { UtilityService } from "src/app/core/services/utility.service";

@Injectable({
    providedIn:'root'
})
export class PptUtilityService{

    constructor(private translateService:TranslateService, private utilityService:UtilityService){}

    addFrontWrapper(pptx: PptxGenJS, formValues: any) {
        let slide = pptx.addSlide();
        let rows: any = [
          [`${this.translateService.instant('Board')}`, `${formValues.board}`],
          [`${this.translateService.instant('Medium')}`, `${formValues.medium}`],
          [`${this.translateService.instant('Class')}`, `${formValues.class}`],
          [`${this.translateService.instant('Subject')}`, `${this.utilityService.getSubjectDisplayName(formValues?.subjects)}`],
          [
            `${this.translateService.instant('Chapter')}`,
            `${formValues.chapter.orderNumber}.${formValues.chapter.topics}`,
          ],
          [this.translateService.instant('SubTopic'), `${formValues.subTopics.join(', ')}`],
        ];
        slide.addTable(rows, {
          y: 0.5,
          x: 1,
          align: 'left',
          valign: 'middle',
          fontFace: 'Calibri (Body)',
          fontSize: 11,
          colW: 4,
          border: { type: 'solid', pt: 1, color: '000000' },
          autoPage: true,
        });
      }


      addLearningOutcome(pptx: PptxGenJS, learningOutcomes: any) {
        let slide = pptx.addSlide();
        slide.addText(this.translateService.instant('LEARNING OUTCOMES'), {
          x: 0.5,
          y: 0.5,
          fontSize: 24,
          bold: true,
          color: pptx.SchemeColor.accent1,
        });
        let rows = learningOutcomes.map((e:any,i:any)=>[`${i+1}. ${e}`])
        slide.addTable(rows, {
          y: 1,
          x: 0.5,
          align: 'left',
          fontFace: 'Calibri (Body)',
          fontSize: 12,
          autoPage: true,
        });
      }
}