import { Injectable } from '@angular/core';
import { Document, Paragraph, HeadingLevel } from 'docx';
import { DocxUtilityService } from './docx-utility.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class LessonDocxGeneratorService {
  constructor(private docxUtility: DocxUtilityService, private translateService:TranslateService) {}

  generateDocx(data: any[], formData: any, checkList:any[], learningOutcomes:any[]) {
  const checklistContent = checkList.map((item) => [
    new Paragraph({
        text: this.translateService.instant(item.type),
        heading: HeadingLevel.HEADING_2, 
        spacing: {
            before: 240,
            after: 200,
        },
    }),
    new Paragraph({
        text: `${this.translateService.instant('Activity')}: ${item.activity}`,
        spacing: {
            before: 80,
            after: 80,
        },
    }),
    new Paragraph({
        text: `${this.translateService.instant('Materials')}: ${item.materials}`,
        spacing: {
            before: 120,
            after: 240,
        },
    }),
]).flat();

// Define the content for the first page with checklist
const firstPageContent = [
    new Paragraph({
        text: this.translateService.instant('LESSON PLAN SUMMARY'),
        heading: HeadingLevel.HEADING_1,
        spacing:{
          after:300
        }
    }),
    ...checklistContent,
];

    let sectionData;
    sectionData = data.map((section) => {
      if (section.type === 'Evaluate') {
        return this.handleEvalutate(section);
      } else {
        return this.handleExploreToEloborate(section, formData);
      }
    });

    const doc = new Document({
      sections: [
        {
            children: firstPageContent,
            headers: this.docxUtility.getHeader(formData),
        },
        {
          children:this.docxUtility.getLearningOutcomes(learningOutcomes),
          headers: this.docxUtility.getHeader(formData),
        },
        ...sectionData.flat(),
    ],
    });
    this.docxUtility.downloadFile(doc, `${formData?.subjects?.name}_Sem${formData?.subjects?.sem}_${formData?.chapter?.topics }`);
  }

  handleExploreToEloborate(section: any, formData: any) {
    return {
      children: [
        new Paragraph({
          text: section.type === 'Engage' ? this.translateService.instant('LESSON PLAN DETAILS') : '',
          heading: HeadingLevel.HEADING_1,
          spacing:{
            after: section.type === 'Engage' ? 300 : 0
          }
        }),
        new Paragraph({
          text: `${this.translateService.instant(section.type.toUpperCase())}`,
          heading: HeadingLevel.HEADING_1,
        }),
        ...section.info
          .map((topic: any, index: any) => [
            new Paragraph({
              pageBreakBefore: index !== 0,
              spacing: {
                before: 80,
                after: 80,
              },
            }),
            ...topic.content.main.split('\n').map((line: any) => {
              return this.docxUtility.getFormatedContent(line);
            }),
          ])
          .flat(),
      ],
      headers: this.docxUtility.getHeader(formData),
    };
  }

  handleEvalutate(section: any) {
    const { content } = section.info[0];

    // Create an array to hold all paragraphs
    const children: Paragraph[] = content.main.flatMap((item: any) => {
      const { difficulty, content } = item;

      // Create a paragraph for the difficulty level
      const difficultyParagraph = new Paragraph({
        text: `${this.translateService.instant(difficulty.charAt(0).toUpperCase() + difficulty.slice(1))}`,
        heading: HeadingLevel.HEADING_2,
        spacing: {
          before: 200,
          after: 80,
        },
      });

      // Handle MCQs
      const mcqs = content
        .filter((block: any) => block.type === 'MCQs')
        .flatMap((block: any) => {
          // Add heading for MCQs
          const mcqHeading = new Paragraph({
            text: this.translateService.instant('MCQs'),
            heading: HeadingLevel.HEADING_5,
            spacing: {
              before: 40,
              after: 20,
            },
          });

          // Create paragraphs for each question and its options
          const questionParagraphs = block.questions.flatMap(
            (question: any, questionIndex: number) => {
              // Paragraph for the question
              const questionParagraph = question?.question ? new Paragraph({
                text: `${questionIndex + 1}. ${question.question}`,
                spacing: {
                  before: 80,
                  after: 20,
                },
              }) : [];

              const optionParagraphs = question?.options ? question?.options?.flatMap((options:any)=>{
                return new Paragraph({
                  text:`${options}`
                })
              }) : [];
              return [questionParagraph, ...optionParagraphs];
            }
          );

          return [mcqHeading, ...questionParagraphs];
        });

      // Handle Assessments
      const assessments = content
        .filter((block: any) => block.type === 'assessment')
        .flatMap((block: any) => {
          // Add heading for Assessments
          const assessmentHeading = new Paragraph({
            text: this.translateService.instant('Assessments'),
            heading: HeadingLevel.HEADING_5,
            spacing: {
              before: 80,
              after: 20,
            },
          });

          // Create paragraphs for each assessment question
          const questionParagraphs = block.questions.map(
            (question: any, questionIndex: number) => {
              return question.question ? new Paragraph({
                text: `${questionIndex + 1}. ${question.question}`,
                spacing: {
                  before: 20,
                  after: 10,
                },
              }):[];
            }
          );

          return [assessmentHeading, ...questionParagraphs];
        });

      // Return the combined paragraphs
      return [difficultyParagraph, ...mcqs, ...assessments];
    });

    // Return the final structure
    return {
      children: [
        new Paragraph({
          text: `${this.translateService.instant(section.type.toUpperCase())}`,
          heading: HeadingLevel.HEADING_1,
        }),
        ...children,
      ],
    };
  }
}
