import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import PptxGenJS from 'pptxgenjs';
import { UtilityService } from 'src/app/core/services/utility.service';
import { PptUtilityService } from './ppt-utility.service';

@Injectable({
  providedIn: 'root',
})
export class LessonPPTGeneratorService {
  constructor(private utilityService: UtilityService, private translateService:TranslateService, private pptUtilityService:PptUtilityService) {}

  generatePpt(data: any[], formValues: any, checkList: any[], learningOutcomes:any[]): void {
    let pptx = new PptxGenJS();
    this.pptUtilityService.addFrontWrapper(pptx, formValues);
    this.addLessonSummary(pptx, checkList);
    this.pptUtilityService.addLearningOutcome(pptx,learningOutcomes);

    data.forEach((item) => {
      if (item.type === 'Evaluate') {
        this.addEvaluateSlides(pptx, item);
      } else {
        this.addStandardSlides(pptx, item);
      }
    });
    pptx
      .writeFile({ fileName: `${formValues?.subjects?.name}_Sem${formValues?.subjects?.sem}_${formValues?.chapter?.topics }.pptx` })
      .then(() => {
        this.utilityService.showSuccess('PPT document downloaded successfully');
      })
      .catch(() => {
        this.utilityService.showError(
          'Something went wrong! Please try again later.'
        );
      });
  }

  addLessonSummary(pptx: PptxGenJS, checkList: any) {
    let slide = pptx.addSlide();
    slide.addText(this.translateService.instant('LESSON PLAN SUMMARY'), {
      x: 0.5,
      y: 0.5,
      fontSize: 24,
      bold: true,
      color: pptx.SchemeColor.accent1,
    });
    const checklistData: any[] = [];
    checkList.forEach((element: any) => {
      checklistData.push([
        {
          text: this.translateService.instant(element.type),
          options: {
            color: pptx.SchemeColor.accent1,
            bold: true,
            fontSize: 14,
            rowH: 2,
          },
        },
      ]);
      checklistData.push([{ text: `${this.translateService.instant('Activity')}: ${element.activity}` }]);
      checklistData.push([{ text: `${this.translateService.instant('Materials')}: ${element.materials}` }]);
    });
    slide.addTable(checklistData, {
      y: 1,
      align: 'left',
      valign: 'middle',
      fontFace: 'Calibri (Body)',
      fontSize: 12,
      autoPage: true,
    });
  }



  addEvaluateSlides(pptx: PptxGenJS, item: any): void {
    item.info.forEach((infoItem: any, i: any) => {
      infoItem.content.main.forEach((difficultyItem: any, j: any) => {
        difficultyItem.content.forEach((contentItem: any, k: any) => {
          if (
            contentItem.type === 'MCQs' ||
            contentItem.type === 'assessment'
          ) {
            let showEvalHeader = false;

            if (i === 0 && j === 0 && k === 0) {
              showEvalHeader = true;
            } else {
              showEvalHeader = false;
            }
            this.addContentSlides(
              pptx,
              item.type,
              difficultyItem.difficulty,
              contentItem,
              showEvalHeader,
              k
            );
          }
        });
      });
    });
  }

  addContentSlides(
    pptx: PptxGenJS,
    mainHeading: string,
    difficulty: string,
    contentItem: any,
    showEvalHeader: boolean,
    k: any
  ): void {
    let slide = pptx.addSlide();
    let yPosition = 0.5;

    if (showEvalHeader) {
      slide.addText(this.translateService.instant(mainHeading), {
        x: 0.5,
        y: 0.5,
        fontSize: 24,
        bold: true,
        color: pptx.SchemeColor.accent1,
      });
    }

    if (k === 0) {
      slide.addText(`${this.translateService.instant(difficulty.toUpperCase())}`, {
        x: 0.5,
        y: showEvalHeader ? 1 : 0.5,
        fontSize: 14,
        bold: true,
        color: pptx.SchemeColor.text1,
      });
    }

    if (contentItem.type === 'MCQs') {
      slide.addText(this.translateService.instant('MCQs'), {
        x: 0.5,
        y: showEvalHeader ? 1.4 : 0.9,
        fontSize: 12,
        bold: true,
        color: pptx.SchemeColor.text1,
      });

      if (showEvalHeader && k === 0) {
        yPosition += 1.4;
      } else if (!showEvalHeader && k === 0) {
        yPosition += 0.9;
      } else {
        yPosition += 0;
      }
      contentItem.questions.forEach((question: any, index: number) => {
        if (yPosition > 4) {
          slide = pptx.addSlide();
          yPosition = 0.8;
        }

        slide.addText(`Q${index + 1}: ${question.question}`, {
          x: 0.5,
          y: yPosition,
          fontSize: 14,
          color: '333333',
        });
        yPosition += 0.5;

        question.options.forEach((option: string, optionIndex: number) => {
          slide.addText(option, {
            x: 1,
            y: yPosition,
            fontSize: 14,
            color: '333333',
          });
          yPosition += 0.5;
        });

        yPosition += 1;
      });
    } else if (contentItem.type === 'assessment') {
      slide.addText(this.translateService.instant('ASSESSMENT'), {
        x: 0.5,
        y: 0.5,
        fontSize: 12,
        bold: true,
        color: pptx.SchemeColor.text1,
      });
      yPosition += 0.5;
      contentItem.questions.forEach((question: any, index: number) => {
        if (yPosition > 5.5) {
          slide = pptx.addSlide();
          yPosition = 0.8;
        }

        if (question.question) {
          slide.addText(`${this.translateService.instant('Assessment')} ${this.translateService.instant('Q')}${index + 1}: ${question.question}`, {
            x: 0.5,
            y: yPosition,
            fontSize: 14,
            color: '333333',
          });
          yPosition += 0.8;
        }
      });
    }
  }

  private addStandardSlides(pptx: PptxGenJS, item: any): void {
    let text = item.info
      .map((infoItem: any) => infoItem.content.main)
      .join('\n\n');
    text = this.parseText(text);
    this.addTextToSlide(pptx, text, item.type);
  }

  private addTextToSlide(pptx: PptxGenJS, text: string, title: string): void {
    let slide = pptx.addSlide();
    let yPosition = title === 'Engage' ? 0 : 1.5;

    if (title === 'Engage') {
      slide.addText(this.translateService.instant('LESSON PLAN DETAILS'), {
        x: 0.5,
        y: 0.5,
        fontSize: 24,
        bold: true,
        color: pptx.SchemeColor.accent1,
      });
    }

    slide.addText(this.translateService.instant(title), {
      x: 0.5,
      y: title === 'Engage' ? 1 : 0.5,
      fontSize: 24,
      bold: true,
      color: pptx.SchemeColor.accent1,
    });
    yPosition += 1;

    let rows: any = [[`${text}`]];
    slide.addTable(rows, {
      y: title === 'Engage' ? 1.5 : 1,
      h: 5,
      align: 'left',
      fontFace: 'Calibri (Body)',
      fontSize: 12,
      autoPage: true,
    });
  }

  parseText(text: string): string {
    text = text.replace(
      /^\s*(#{1,6})\s*(.+)$/gm,
      (match, hash, content) => content
    );

    text = text.replace(
      /\*\*(.*?)\*\*|\*(.*?)\*/g,
      (match, p1, p2) => p1 || p2
    );

    text = text.replace(/"([^"]*)"/g, (match, content) => content);

    return text;
  }
}
