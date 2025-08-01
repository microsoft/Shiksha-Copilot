import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  Header,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { UtilityService } from 'src/app/core/services/utility.service';

@Injectable({
  providedIn: 'root',
})
export class DocxUtilityService {
  cellSpace = {
    indent: { left: 100, right: 100 },
    spacing: { before: 100, after: 100 },
  };

  constructor(private utilityService:UtilityService, private translateService:TranslateService){}

  /**
   * Function to format docx data
   * @param line
   * @returns
   */
  getFormatedContent(line: any) {
    const cleanedLine = line.replace(/#/g, '');

    const paragraphChildren = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = boldRegex.exec(cleanedLine)) !== null) {
        if (match.index > lastIndex) {
            paragraphChildren.push(
                new TextRun(cleanedLine.substring(lastIndex, match.index))
            );
        }
        paragraphChildren.push(new TextRun({ text: match[1], bold: true }));
        lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < cleanedLine.length) {
        paragraphChildren.push(new TextRun(cleanedLine.substring(lastIndex)));
    }

    return new Paragraph({
        children: paragraphChildren,
    });
}

  /**
   * Function to download doc file
   * @param doc
   * @param fileName
   */
  downloadFile(doc: any, fileName: any) {
    Packer.toBlob(doc).then((blob) => {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName + '.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.utilityService.showSuccess('Document downloaded successfully!')
    }).catch(()=>{
      this.utilityService.showError('Something went wrong! Please try again later.')
    })
  }

  getLearningOutcomes(learningOutcomes:any[]){
    const loContent = learningOutcomes.map((item,i) => [
      new Paragraph({
          text: `${i + 1}. ${item}`,
          spacing: {
              before: 80,
              after: 80,
          },
      })
  ]).flat();

  // Define the content for the first page with checklist
  const learningOutcomesContent = [
      new Paragraph({
          text: this.translateService.instant('LEARNING OUTCOMES'),
          heading: HeadingLevel.HEADING_1,
          spacing:{
            after:300
          }
      }),
      ...loContent,
  ];

  return learningOutcomesContent
  }

  /**
   * Function to get footer data
   * @param formData 
   * @returns 
   */
  getHeader(formData: any) {
    return {
      default: new Header({
        children: [
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({ text: this.translateService.instant('Board'), ...this.cellSpace }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: this.translateService.instant('Medium'), ...this.cellSpace }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: this.translateService.instant('Class'), ...this.cellSpace }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: this.translateService.instant('Subject'), ...this.cellSpace }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: this.translateService.instant('Chapter'), ...this.cellSpace }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ text: this.translateService.instant('Sub-Topic'), ...this.cellSpace }),
                    ],
                  }),
                ],
                tableHeader: true,
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: formData.board,
                        ...this.cellSpace,
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text:
                          formData.medium.charAt(0).toUpperCase() +
                          formData.medium.slice(1),
                        ...this.cellSpace,
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: formData.class.toString(),
                        ...this.cellSpace,
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: this.utilityService.getSubjectDisplayName(formData.subjects),
                        ...this.cellSpace,
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: `${formData.chapter.orderNumber}. ${formData.chapter.topics}`,
                        ...this.cellSpace,
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: formData.subTopics.join(', '),
                        ...this.cellSpace,
                      }),
                    ],
                  }),
                ],
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ 
            text: "", 
            spacing: {
                after: 200, 
            },
        }),
        ],
      }),
    };
  }
}
