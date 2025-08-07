import { Injectable } from '@angular/core';
import { Document, Paragraph, HeadingLevel } from 'docx';
import { DocxUtilityService } from './docx-utility.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class ResourceDocxService {
  resourceMapper: any = {
    activities: this.translateService.instant('ACTIVITIES'),
    questionbank: this.translateService.instant('QUESTION BANK'),
    realworldscenarios: this.translateService.instant('REAL WORLD SCENARIOS'),
  };

  constructor(private docxUtility: DocxUtilityService, private translateService:TranslateService) {}

  /**
   * Function to generate docx
   * @param data
   * @param type
   * @param fileName
   */
  generateDocx(data: any, formData: any, learningOutcomes:any[]) {
    const sections = [];

    for (const section of data) {
      const sectionChildren = [];
      sectionChildren.push(
        new Paragraph({
          text: this.resourceMapper[section.section],
          heading: HeadingLevel.HEADING_1,
        })
      );

      for (const item of section.data) {
        // Add difficulty level header for non-activities sections
        if (section.section !== 'activities') {
          sectionChildren.push(
            new Paragraph({
              text: `${
                this.translateService.instant(item.difficulty.charAt(0).toUpperCase() +
                item.difficulty.slice(1))
              }`,
              heading: HeadingLevel.HEADING_2,
              spacing: {
                before: 200,
                after: 200,
              },
            })
          );
          if(item?.difficulty && item.content.length ===0){
            sectionChildren.push(
              new Paragraph({
                text:`${this.translateService.instant('No Data Available')}!`
              })
            )
          }

        }

        if (Array.isArray(item.content)) {
          // Handle MCQs and Assessments
          if (section.section === 'questionbank') {
            const contentChildren = item.content.flatMap((content: any) => {
              // Handle MCQs
              const mcqs =
                content.type === 'MCQs'
                  ? content.questions.flatMap(
                      (question: any, questionIndex: number) => {
                        const questionParagraph = question?.question ? new Paragraph({
                          text: `${questionIndex + 1}. ${question.question}`,
                          spacing: {
                            before: 80,
                            after: 10,
                          },
                        }) : [];

                        const optionParagraphs = question?.options ? question?.options?.flatMap((options:any)=>{
                          return new Paragraph({
                            text:`${options}`
                          })
                        }) : []
                        return [questionParagraph, ...optionParagraphs];
                      }
                    )
                  : [];

              // Handle Assessments
              const assessments =
                content.type === 'assessment'
                  ? content.questions.map(
                      (question: any, questionIndex: number) => {
                        return question.question ? new Paragraph({
                          text: `${questionIndex + 1}. ${question.question}`,
                          spacing: {
                            before: 80,
                            after: 10,
                          },
                        }) : '';
                      }
                    )
                  : [];

              // Add heading for MCQs or Assessments
              const contentHeading =
                content.type === 'MCQs'
                  ? new Paragraph({
                      text: this.translateService.instant('MCQs'),
                      heading: HeadingLevel.HEADING_3,
                      spacing: {
                        before: 40,
                        after: 20,
                      },
                    })
                  : content.type === 'assessment'
                  ? new Paragraph({
                      text: this.translateService.instant('Assessments'),
                      heading: HeadingLevel.HEADING_3,
                      spacing: {
                        before: 40,
                        after: 20,
                      },
                    })
                  : null;

              return [contentHeading, ...mcqs, ...assessments].filter(Boolean); // Filter out any null values
            });

            sectionChildren.push(...contentChildren);
          } else if (section.section === 'realworldscenarios') {
            // Handle Real World Scenarios
            const realWorldScenariosChildren = item.content.flatMap(
              (scenario: any) => {
                // Add heading for the real world scenario
                const scenarioTitle = new Paragraph({
                  text: scenario.title,
                  heading: HeadingLevel.HEADING_3,
                  spacing: {
                    before: 40,
                    after: 20,
                  },
                });

                const questionParagraph = new Paragraph({
                  text: scenario.question,
                  spacing: {
                    before: 20,
                    after: 10,
                  },
                });

                const descriptionParagraph = new Paragraph({
                  text: scenario.description,
                  spacing: {
                    before: 10,
                    after: 20,
                  },
                });

                return [scenarioTitle, questionParagraph, descriptionParagraph];
              }
            );

            sectionChildren.push(...realWorldScenariosChildren);
          }
        } else if (section.section === 'activities') {
          // Handle activities with the new structure
          sectionChildren.push(
            new Paragraph({
              text: item.title,
              heading: HeadingLevel.HEADING_3,
              spacing:{
                before:200
              }
            })
          );

          if (item.preparation) {
            sectionChildren.push(
              new Paragraph({
                text: `${item.preparation}`,
                bullet: {
                  level: 0,
                },
              })
            );
          }

          if (item.required_materials) {
            sectionChildren.push(
              new Paragraph({
                text: `${item.required_materials}`,
                bullet: {
                  level: 0,
                },
              })
            );
          }

          if (item.obtaining_materials) {
            sectionChildren.push(
              new Paragraph({
                text: `${item.obtaining_materials}`,
                bullet: {
                  level: 0,
                },
              })
            );
          }

          if (item.recap) {
            sectionChildren.push(
              new Paragraph({
                text: `${item.recap}`,
              })
            );
          }
        }
      }

      sections.push({
        children: sectionChildren,
        headers: this.docxUtility.getHeader(formData),
      });
    }

    const doc = new Document({
      sections: [
        {
            children: this.docxUtility.getLearningOutcomes(learningOutcomes),
            headers: this.docxUtility.getHeader(formData),
        },
        ...sections.flat(),
    ]
    });
    this.docxUtility.downloadFile(doc, `${formData?.subjects?.name}_Sem${formData?.subjects?.sem}_${formData?.chapter?.topics }`);
  }
}
