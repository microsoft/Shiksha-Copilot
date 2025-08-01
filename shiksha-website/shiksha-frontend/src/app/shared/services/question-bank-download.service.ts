import { Injectable } from '@angular/core';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Footer,
  Header,
  Table,
  TableCell,
  TableRow,
  WidthType,
  PageNumber,
  TabStopType
} from 'docx';
import { saveAs } from 'file-saver';
import { UtilityService } from 'src/app/core/services/utility.service';

@Injectable({
  providedIn: 'root',
})
export class QuestionBankDownloadService {
  constructor(private utilityService:UtilityService) {}

  downloadQuestionBank(data: any) {
    const doc = new Document({
      sections: [{
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                text: data.questionBank.metadata.schoolName,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: {
                  before: 120,
                  after: 120,
              }
              }),
              new Paragraph({
                text: data.examinationName,
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER,
                spacing: {
                  before: 120,
                  after: 120,
              }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Subject: ${data.subject}`, bold: true }),
                  new TextRun({ text: "\tClass: " + data.grade, bold: true }),
                  new TextRun({ text: "\tMarks: " + data.totalMarks, bold: true }),
                ],
                tabStops: [
                  { type: TabStopType.CENTER, position: 4500 }, // middle of page (approx)
                  { type: TabStopType.RIGHT, position: 9000 },  // right of page
                ],
                spacing: {
                  before: 120,
                  after: 120,
              }
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: ["Page ", PageNumber.CURRENT]})],
              }),
            ],
          }),
        },
        children: this.buildQuestions(data.questionBank.questions),
      }],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `${data.subject}_QuestionBank.docx`);
    });
  }

  private buildQuestions(questionsArray: any[]) {
    const content: (Paragraph | Table)[] = [];
    let sectionCount = 1;
  
    for (const section of questionsArray) {
      const roman = this.utilityService.intToRoman(sectionCount);
      content.push(new Paragraph({
        children: [
          new TextRun({ text: `${roman}. ${section.type}`, bold: true }),
          new TextRun({ text: `\t${section.numberOfQuestions} X ${section.marksPerQuestion} = ${section.numberOfQuestions * section.marksPerQuestion}`, bold: true }),
        ],
        tabStops: [
          { type: TabStopType.RIGHT, position: 9000 },
        ],
        spacing: {
          before: 120,
          after: 120,
      }
      }));
  
      section.questions.forEach((q: any, index: number) => {
        if (q.question) {
          content.push(new Paragraph({
            text: `${index + 1}. ${q.question}`,
            spacing: { after: 100 },
          }));
          if (q.options) {
            q.options.forEach((opt: string, i: number) => {
              content.push(new Paragraph({
                text: `   ${String.fromCharCode(65 + i)}. ${opt}`,
                spacing: { after: 120 },
              }));
            });
          }
        } else if (q.columnOneValues && q.columnTwoValues) {
          const colTwoVal = structuredClone(q.columnTwoValues)
          const shuffedColums = this.utilityService.shuffleOptions(colTwoVal)
          content.push(this.buildMatchTable(q.columnOneValues, shuffedColums));
        }
      });
  
      content.push(new Paragraph({ text: "" }));
      sectionCount++;
    }
  
    return content;
  }
  

  private buildMatchTable(col1: string[], col2: string[]) {
    const rows: TableRow[] = [];

    for (let i = 0; i < col1.length; i++) {
      rows.push(new TableRow({
        children: [
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({text: ` ${col1[i]}`,spacing:{before:50, after:50}})] }),
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({text:` ${col2[i]}`,spacing:{before:50, after:50}})] }),
        ],
      }));
    }

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        ...rows,
      ],
    });
  }
}
