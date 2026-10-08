import { Injectable } from '@angular/core';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  TableLayoutType,
} from 'docx';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root',
})
export class BluePrintExportService {
  exportToWord(
    flatData: Array<{
      unitName: string;
      type: string;
      objective: string;
      marks: number;
    }>,
    metadata: {
      subject: string;
      class: string;
      totalMarks: number;
      schoolName: string;
      medium: string;
      examinationName: string;
    }
  ) {
    const heading = new Paragraph({
      text: `${this.capitalize(metadata.examinationName)} - Blueprint`,
      heading: 'Heading1',
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    });

    // Create simple 2-col metadata table
    const metadataRows = Object.entries(metadata).map(
      ([key, value]) =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: this.capitalize(key) + ':',
                      bold: true,
                    }),
                  ],
                }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              width: { size: 30, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph( key === 'schoolName' ? value.toString() : this.capitalize(value.toString()))],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              width: { size: 70, type: WidthType.PERCENTAGE },
            }),
          ],
        })
    );

    const metadataTable = new Table({
      rows: metadataRows,
      width: { size: 50, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: '000000',
        },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      },
    });

    // Table Header Row
    const headerRow = new TableRow({
      children: ['Topic', 'Type', 'Objective', 'Marks'].map((text) =>
        this.createPaddedCell(text, true)
      ),
    });

    // Data Rows
    const dataRows = flatData.map(
      (item) =>
        new TableRow({
          children: [
            this.createPaddedCell(item.unitName),
            this.createPaddedCell(item.type),
            this.createPaddedCell(item.objective),
            this.createPaddedCell(item.marks.toString()),
          ],
        })
    );

    const dataTable = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: '000000',
        },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      },
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            heading,
            new Paragraph(''),
            metadataTable,
            new Paragraph(''),
            dataTable,
          ],
        },
      ],
    });

    const fileName = `${metadata.subject}_${metadata.class}_${metadata.examinationName}_Blueprint`;

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, fileName);
    });
  }

  private createPaddedCell(text: string, isHeader: boolean = false): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: isHeader, size: 22 })],
        }),
      ],
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      width: { size: 25, type: WidthType.PERCENTAGE },
    });
  }

  private capitalize(str: string) {
    return (
      str.charAt(0).toUpperCase() +
      str
        .slice(1)
        .replace(/([A-Z])/g, ' $1')
        .trim()
    );
  }
}
