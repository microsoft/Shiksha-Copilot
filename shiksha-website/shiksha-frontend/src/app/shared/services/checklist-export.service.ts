import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  HeadingLevel,
  PageOrientation,
  Footer,
  AlignmentType,
} from 'docx';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root',
})
export class CheckListExportService {
  constructor(
    private datePipe:DatePipe
  ) {}

  public generateChecklist(subjectInfo: any, lo: string[], checklistData: any[],fileName:any) {
    const subjectInfoTable = this.createSubjectInfoTable(subjectInfo);

    // Learning Outcomes section
    const loTitle = new Paragraph({
      text: 'Learning Outcomes',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 },
    });

    const loParagraphs = lo.map((item) =>
      new Paragraph({
        text: item,
        bullet: { level: 0 },
      })
    );

    // Checklist table
    const checklistTable = this.createChecklistTable(checklistData);

    const doc = new Document({
      sections: [
        {
          properties:{
            page:{
              size:{
                orientation:PageOrientation.LANDSCAPE
              }
            }
          },
          children: [
            subjectInfoTable,
            new Paragraph({ text: '', spacing: { after: 200 } }),
            loTitle,
            ...loParagraphs,
            new Paragraph({ text: '', spacing: { after: 200 } }),
            checklistTable,
          ],
          footers: {
                    default: new Footer({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new Paragraph({
        text: 'Created using Shiksha Co-pilot, developed in collaboration with Microsoft Research India'
      })],
                        }),
                      ],
                    }),
                  }
        },
        
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, fileName);
    });
  }

  private createSubjectInfoTable(data: any): Table {

    const hwidth:any = ['Sub-Topic','School Name', 'Teacher Name', 'Report Generated Date']
    const headerRow = new TableRow({
      children: ['Board', 'Medium', 'Class', 'Subject', 'Chapter', 'Sub-Topic','School Name', 'Teacher Name', 'Report Generated Date'].map((title) =>

        hwidth.includes(title) ? new TableCell({
          children: [new Paragraph({ text: title })],
          width: { size: 15, type: WidthType.PERCENTAGE },
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          }
        }) :

        new TableCell({
          children: [new Paragraph({ text: title })],
          width: { size: 8, type: WidthType.PERCENTAGE },
          margins: {
            top: 50, // 100 = 0.1 inch
            bottom: 50,
            left: 50,
            right: 50,
          }
        })
      ),
    });

    const valueRow = new TableRow({
      children: [
        data.board || '',
        data.medium || '',
        data.class?.toString() || '',
        data.subjects?.name || '',
        data.topics || '',
        (data.subTopics && data.subTopics.join(', ')) || '',
        data.schoolName || '',
        data.teacherName || '',
       this.datePipe.transform(data.reportGeneratedDate, 'dd-MM-yyyy') || '',
      ].map((value) =>
        new TableCell({
          children: [new Paragraph(value)],
          margins: {
            top: 100, // 100 = 0.1 inch
            bottom: 100,
            left: 100,
            right: 100,
          }
        })
      ),
    });

    return new Table({
      rows: [headerRow, valueRow],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      },
    });
  }

  private createChecklistTable(checklistData: any[]): Table {

    const hwidth = ['Classroom Process', 'TLM']
    const headerRow = new TableRow({
      children: ['Phase', 'Classroom Process', 'TLM','CCE Tools and Techniques', 'Teacher Reflection'].map((title) =>

        hwidth.includes(title) ? 
         new TableCell({
          children: [new Paragraph({ text: title})],
          width: { size: 30, type: WidthType.PERCENTAGE },
          margins: {
            top: 50, // 100 = 0.1 inch
            bottom: 50,
            left: 50,
            right: 50,
          }
        }) :
        new TableCell({
          children: [new Paragraph({ text: title})],
          width: { size: 10, type: WidthType.PERCENTAGE },
          margins: {
            top: 50, // 100 = 0.1 inch
            bottom: 50,
            left: 50,
            right: 50,
          }
        })
      ),
    });

    const dataRows = checklistData.map((item) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(item.type)],margins: {
            top: 100, // 100 = 0.1 inch
            bottom: 100,
            left: 100,
            right: 100,
          } }),
          new TableCell({ children: [new Paragraph(item.activity)],margins: {
            top: 100, // 100 = 0.1 inch
            bottom: 100,
            left: 100,
            right: 100,
          } }),
          new TableCell({ children: [new Paragraph(item.materials)],margins: {
            top: 100, // 100 = 0.1 inch
            bottom: 100,
            left: 100,
            right: 100,
          } }),
          new TableCell({ children: [new Paragraph(item.cceTools)],margins: {
            top: 100, // 100 = 0.1 inch
            bottom: 100,
            left: 100,
            right: 100,
          } }), // Empty for teacher reflection
          new TableCell({ children: [new Paragraph('')],margins: {
            top: 100, // 100 = 0.1 inch
            bottom: 100,
            left: 100,
            right: 100,
          } }), // Empty for teacher reflection
        ],
      })
    );

    return new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      },
    });
  }
}
