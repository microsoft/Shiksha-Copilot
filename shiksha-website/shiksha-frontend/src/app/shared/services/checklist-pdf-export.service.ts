import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import * as pdfMake from 'pdfmake/build/pdfmake';
const pdfFonts = require('../../../assets/fonts/vfs_fonts.js');

(pdfMake as any).vfs = (pdfFonts as any).vfs;

(pdfMake as any).addFonts({
  NotoKannada: {
    normal: 'NotoSansKannada-Regular.ttf',
    bold: 'NotoSansKannada-Medium.ttf',
    italics: 'NotoSansKannada-Thin.ttf',
    bolditalics: 'NotoSansKannada-Thin.ttf',
  }
});

@Injectable({
  providedIn: 'root',
})
export class ChecklistPdfExportService {
  constructor(private datePipe: DatePipe) {}

  generateChecklistPDF(
    subjectInfo: any,
    learningOutcomes: string[],
    checklistData: any[],
    fileName: string
  ) {
    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [15, 15, 15, 20],
       defaultStyle: {
        font: 'NotoKannada'  // set default to Kannada
      },
      footer: {
        columns: [
          {
            text:
              'Created using Shiksha Co-pilot, developed in collaboration with Microsoft Research India',
            alignment: 'center',
            fontSize: 7,
            margin: [0, 5],
          },
        ],
      },
      content: [
        this.getSubjectInfoTable(subjectInfo),
        { text: '\n' },
        { text: 'Learning Outcomes', style: 'h4', margin: [0, 0, 0, 5] },
        ...learningOutcomes.map((item) => ({
          ul: [item],
          fontSize:8,
          margin: [0, 1],
        })),
        { text: '\n' },
        this.getChecklistTable(checklistData),
      ],
      styles: {
        h1: { fontSize: 20, bold: true },
        h2: { fontSize: 16, bold: true },
        h3: { fontSize: 14, bold: true },
        h4: { fontSize: 12, bold: true },
        tableHeader: { bold: true, fontSize: 10, color: 'black' },
        tableCellSmall: { fontSize: 8 }
      },
    };

    pdfMake.createPdf(docDefinition).download(fileName);
  }

  private getSubjectInfoTable(data: any): any {
    const headers = [
      'Board',
      'Medium',
      'Class',
      'Subject',
      'Chapter',
      'Sub-Topic',
      'School Name',
      'Teacher Name',
      'Report Generated Date',
    ];

    const values = [
      {text:data.board || '', style:'tableCellSmall'},
      {text:data.medium || '', style:'tableCellSmall'},
      {text:data.class?.toString() || '', style:'tableCellSmall'},
      {text:data.subjects?.name || '', style:'tableCellSmall'},
      {text:data.topics || '', style:'tableCellSmall'},
      {text:(data.subTopics && data.subTopics.join(', ')) || '', style:'tableCellSmall'},
      {text:data.schoolName || '', style:'tableCellSmall'},
      {text:data.teacherName || '', style:'tableCellSmall'},
      {text:this.datePipe.transform(data.reportGeneratedDate, 'dd-MM-yyyy') || '', style:'tableCellSmall'},
    ];

    const columnWidths = headers.map((h) =>
      ['Sub-Topic', 'School Name', 'Teacher Name', 'Report Generated Date'].includes(h)
        ? '*'
        : 'auto'
    );

    return {
      table: {
        headerRows: 1,
        widths: columnWidths,
        body: [
          headers.map((h) => ({ text: h, style: 'tableHeader' })),
          values,
        ],
      },
      layout: 'grid',
    };
  }

  private getChecklistTable(data: any[]): any {
    const headers = [
      'Phase',
      'Classroom Process',
      'TLM',
      'CCE Tools and Techniques',
      'Teacher Reflection',
    ];

    const body = [
      headers.map((h) => ({ text: h, style: 'tableHeader' })),
      ...data.map((item) => [
        {text:item.type || '', style:'tableCellSmall'},
        {text:item.activity || '', style:'tableCellSmall'},
        {text:item.materials || '', style:'tableCellSmall'},
        {text:item.cceTools || '', style:'tableCellSmall'},
        '', // Teacher Reflection (left blank)
      ]),
    ];

    return {
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', '*', '*'],
        body,
      },
      layout: 'grid',
    };
  }
}
