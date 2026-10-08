import { Injectable } from '@angular/core';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { DocxUtilityService } from './docx-utility.service';

@Injectable({
  providedIn: 'root',
})
export class DocumentExportService {
  constructor(private docxUtility: DocxUtilityService) {}

  downloadDoc(
    data: any[],
    headerData: any,
    filename: string = 'output.docx'
  ): void {
    const docSections = [];

    for (const section of data) {
      const sectionContent: Paragraph[] = [];

      // Section Title
      sectionContent.push(
        new Paragraph({
          text: section.title.toUpperCase(),
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
        })
      );

      switch (section.outputFormat) {
        case 'plain_text':
          sectionContent.push(...this.formatPlainText(section.content));
          break;
        case 'json_1':
          sectionContent.push(...this.formatQuestionBank(section.content));
          break;
        case 'json_2':
          sectionContent.push(
            ...this.formatRealWorldScenarios(section.content)
          );
          break;
        case 'json_3':
          sectionContent.push(...this.formatActivities(section.content));
          break;
        default:
          sectionContent.push(
            new Paragraph({ text: 'Unsupported content format.' })
          );
      }

      // Add spacing between sections
      sectionContent.push(new Paragraph({ text: '', spacing: { after: 300 } }));

      docSections.push({
        properties: {},
        children: sectionContent,
        headers: this.docxUtility.getHeader(headerData),
      });
    }

    const doc = new Document({
      sections: docSections,
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, filename);
    });
  }

  private formatPlainText(content: string): Paragraph[] {
    const lines = content.split('\n').filter((line) => line.trim() !== '');
    const paragraphs: Paragraph[] = [];

    lines.forEach((line) => {
      const spacingAfter = 100;
      if (line.trim().startsWith('- ')) {
        const cleaned = line.replace('- ', '');
        paragraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            children: this.getFormattedContent(cleaned),
            spacing: { after: spacingAfter },
          })
        );
      } else {
        paragraphs.push(
          new Paragraph({
            children: this.getFormattedContent(line),
            spacing: { after: spacingAfter },
          })
        );
      }
    });

    return paragraphs;
  }

  private getFormattedContent(line: string): TextRun[] {
    const cleanedLine = line.replace(/#/g, '');
    const paragraphChildren: TextRun[] = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match: RegExpExecArray | null;
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

    return paragraphChildren;
  }

  private formatQuestionBank(content: any[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    content.forEach((level) => {
      paragraphs.push(
        new Paragraph({
          text: level.difficulty.toUpperCase(),
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200 },
        })
      );

      level.content.forEach((block: any) => {
        paragraphs.push(
          new Paragraph({
            text: block.type.toUpperCase(),
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 150 },
          })
        );

        block.questions.forEach((q: any, index: any) => {
          paragraphs.push(
            new Paragraph({
              text: `${index + 1}. ${q.question}`,
              spacing: { after: 100 },
            })
          );

          if (q.options) {
            q.options.forEach((opt: any) => {
              paragraphs.push(
                new Paragraph({
                  children: [new TextRun(opt)],
                  bullet: { level: 0 },
                  spacing: { after: 50 },
                })
              );
            });
          }

          // Add small gap after each question
          paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        });
      });

      // Gap after each difficulty level
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    });

    return paragraphs;
  }

  private formatRealWorldScenarios(content: any[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    content.forEach((level) => {
      paragraphs.push(
        new Paragraph({
          text: level.difficulty.toUpperCase(),
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200 },
        })
      );

      level.content.forEach((item: any) => {
        paragraphs.push(
          new Paragraph({
            text: item.title,
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 150 },
          })
        );

        paragraphs.push(
          new Paragraph({
            text: `Q: ${item.question}`,
            spacing: { after: 100 },
          })
        );

        paragraphs.push(
          new Paragraph({
            text: item.description,
            spacing: { after: 200 },
          })
        );
      });
    });

    return paragraphs;
  }

  private formatActivities(content: any[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    content.forEach((activity) => {
      paragraphs.push(
        new Paragraph({
          text: activity.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200 },
        })
      );

      paragraphs.push(
        new Paragraph({
          text: 'Preparation:',
          spacing: { after: 100 },
        })
      );
      paragraphs.push(
        new Paragraph({
          text: activity.preparation,
          spacing: { after: 150 },
        })
      );

      paragraphs.push(
        new Paragraph({
          text: 'Required Materials:',
          spacing: { after: 100 },
        })
      );
      paragraphs.push(
        new Paragraph({
          text: activity.required_materials,
          spacing: { after: 150 },
        })
      );

      paragraphs.push(
        new Paragraph({
          text: 'Obtaining Materials:',
          spacing: { after: 100 },
        })
      );
      paragraphs.push(
        new Paragraph({
          text: activity.obtaining_materials,
          spacing: { after: 150 },
        })
      );

      paragraphs.push(
        new Paragraph({
          text: 'Recap:',
          spacing: { after: 100 },
        })
      );
      paragraphs.push(
        new Paragraph({
          text: activity.recap,
          spacing: { after: 200 },
        })
      );
    });

    return paragraphs;
  }
}
