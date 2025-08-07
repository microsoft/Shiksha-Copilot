import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import PptxGenJS from 'pptxgenjs';
import { UtilityService } from 'src/app/core/services/utility.service';
import { PptUtilityService } from './ppt-utility.service';

@Injectable({
  providedIn: 'root'
})
export class ResourcePptGeneratorService {

  constructor(private utilityService: UtilityService, private translateService:TranslateService, private pptUtilityService:PptUtilityService) { }

  generatePpt(resources: any, formvalues: any, learningOutcomes:any[]) {
    const pptx = new PptxGenJS();

    this.pptUtilityService.addFrontWrapper(pptx, formvalues);
    this.pptUtilityService.addLearningOutcome(pptx,learningOutcomes);

    this.addslidesforResources(pptx, resources);

    // Save the presentation
    pptx
      .writeFile({ fileName: `${formvalues?.subjects?.name}_Sem${formvalues?.subjects?.sem}_${formvalues?.chapter?.topics }.pptx` })
      .then(() => {
        this.utilityService.showSuccess('PPT downloaded successfully');
      })
      .catch(() => {
        this.utilityService.showError(
          'Something went wrong! Please try again later.'
        );
      });
  }

  addslidesforResources(pptx: any, resources: any) {
    const maxY = 5; // Define the maximum Y position before creating a new slide
    const slideWidth = 10; // Width of the slide (in inches)
    const marginX = 0.5; // Margin from the left and right edges
    const contentWidth = slideWidth - 2 * marginX; // Content width accounting for margins
    let currentY = 0; // Start Y position for content on the slide  
    resources?.forEach((resource: any) => {
      let slide = pptx.addSlide();
      currentY = 0; // Reset Y position for new slide
      const sectionTitle = this.formatSectionTitle(resource.section);
      slide.addText(sectionTitle, { x: marginX, y: currentY + 0.5, w: contentWidth, fontSize: 20, bold: true, color: pptx.SchemeColor.accent1 });
      currentY += 0.5; // Update Y position after adding title

      resource.data.forEach((item: any) => {
        // Check if difficulty exists before adding it
        if (item.difficulty) {
          if (item.difficulty.toLowerCase() === 'intermediate' || item.difficulty.toLowerCase() === 'advanced') {
            // Force a new slide for intermediate or advanced difficulties
            slide = pptx.addSlide();
            currentY = 0; // Reset Y position for new slide
        }
          if (currentY > maxY) {
            slide = pptx.addSlide();
            currentY = 0; // Reset Y position for new slide
          }
          slide.addText(`${this.translateService.instant(item.difficulty.toUpperCase())}`, { x: marginX, y: currentY + 0.5, w: contentWidth, fontSize: 14, bold: true });
          currentY += 0.5; // Update Y position after adding difficulty
        }

         // Handling real-world scenarios content
         if (resource.section === 'realworldscenarios' && item.content) {
          item.content.forEach((content: any) => {
              if (currentY + 2 > maxY) {
                  slide = pptx.addSlide();
                  currentY = 0; // Reset Y position for new slide
              }
              
              // Title
              slide.addText(`${this.translateService.instant('Title')}: ${content.title}`, { 
                  x: marginX, 
                  y: currentY + 0.5, 
                  w: contentWidth, 
                  fontSize: 14, 
                  bold: true 
              });
              currentY += 0.5; // Update Y position after title
              
              // Question
              slide.addText(`${this.translateService.instant('Question')}: ${content.question}`, { 
                  x: marginX, 
                  y: currentY + 0.5, 
                  w: contentWidth, 
                  fontSize: 12 
              });
              currentY += 0.5; // Update Y position after question
              
              // Description
              slide.addText(`${this.translateService.instant('Description')}: ${content.description}`, { 
                  x: marginX, 
                  y: currentY + 0.7, 
                  w: contentWidth, 
                  fontSize: 12 
              });
              currentY += 1.5; // Update Y position after description
          });
      }

        if (resource.section === 'activities') {
          // Ensure there's enough space for the title and at least one line of content
          if (currentY + 1.5 > maxY) {
            slide = pptx.addSlide();
            currentY = 0; // Reset Y position for new slide
          }

          // Adding the title and preparation of each activity
          slide.addText(`${this.translateService.instant('Title')}: ${item.title}`, { x: marginX, y: currentY + 0.5, w: contentWidth, fontSize: 14, bold: true });
          currentY += 0.5; // Reduced space after title
          slide.addText(`${this.translateService.instant('Preparation')}: ${item.preparation}`, { x: marginX, y: currentY + 0.7, w: contentWidth, fontSize: 14 });
          currentY += 1; // Reduced space between sections
          slide.addText(`${this.translateService.instant('Required Materials')}: ${item.required_materials}`, { x: marginX, y: currentY + 0.7, w: contentWidth, fontSize: 14 });
          currentY += 1;
          slide.addText(`${this.translateService.instant('Obtaining Materials')}: ${item.obtaining_materials}`, { x: marginX, y: currentY + 0.7, w: contentWidth, fontSize: 14 });
          currentY += 1;
          slide.addText(`${this.translateService.instant('Recap')}: ${item.recap}`, { x: marginX, y: currentY + 0.7, w: contentWidth, fontSize: 14 });
          currentY += 0.5;

          // If the current slide is full, create a new slide
          if (currentY > maxY) {
            slide = pptx.addSlide();
            currentY = 0; // Reset Y position for new slide
          }
        }

        else {
          if (item.content) {
            if (item.content.length === 0) {
              if (currentY > maxY) {
                slide = pptx.addSlide();
                currentY = 0; // Reset Y position for new slide
              }
              slide.addText(this.translateService.instant('No Content for this section'), { x: marginX, y: currentY + 0.5, w: contentWidth, fontSize: 14, italic: true });
              currentY += 0.5; // Update Y position after adding no content message
            } else {
              let previousContentType = 'MCQs'; // Initialize to a default type
              item.content.forEach((content: any, index: number) => {
                if (content.type) {
                  const contentType = content.type === 'assessment' ? 'ASSESSMENT' : content.type;

                  if (contentType !== previousContentType) {
                    slide = pptx.addSlide(); // Start a new slide for a new content type
                    currentY = 0; // Reset Y position for new slide
                    previousContentType = contentType; // Update previousContentType to current one
                  }

                  slide.addText(`${this.translateService.instant(contentType)}:`, { x: marginX, y: currentY + 0.5, w: contentWidth, fontSize: 14, bold: true });
                  currentY += 0.5; // Update Y position after adding content type

                  if (content.questions && content.questions.length > 0) {
                    if (contentType === 'MCQs') {
                      slide.addText(`Q1. ${content.questions[0].question}`, { x: marginX, y: currentY + 0.5, w: contentWidth, fontSize: 14 });
                      currentY += 0.5; // Update Y position after adding the first question

                      if (content.questions[0].options) {
                        content.questions[0].options.forEach((option: string, oIndex: number) => {
                          slide.addText(option, { x: marginX + 0.5, y: currentY + 0.5, w: contentWidth - 0.5, fontSize: 14 });
                          currentY += 0.4; // Update Y position after adding option
                        });
                        currentY += 1; // Add space after options
                      }

                      content.questions.slice(1).forEach((question: any, qIndex: number) => {
                        slide = pptx.addSlide();
                        currentY = 0; // Reset Y position for new slide

                        slide.addText(`Q${qIndex + 2}. ${question.question}`, { x: marginX, y: currentY + 0.5, w: contentWidth, fontSize: 14 });
                        currentY += 0.5; // Update Y position after adding question

                        if (question.options) {
                          question.options.forEach((option: string, oIndex: number) => {
                            slide.addText(option, { x: marginX + 0.5, y: currentY + 0.5, w: contentWidth - 0.5, fontSize: 14 });
                            currentY += 0.4; // Update Y position after adding option
                          });
                          currentY += 1; // Add space after options
                        }
                      })
                    } else if (contentType === 'ASSESSMENT') {
                      // Handle Assessment content
                      content.questions.forEach((question: any, qIndex: number) => {
                        if (currentY + 1 > maxY) {
                          slide = pptx.addSlide(); // Create new slide if current slide is full
                          currentY = 0; // Reset Y position for new slide
                        }

                        slide.addText(`${this.translateService.instant('Assessment')} Q${qIndex + 1}. ${question.question}`, { x: marginX, y: currentY + 0.5, w: contentWidth, fontSize: 14 });
                        currentY += 0.5; // Update Y position after adding the question

                        if (question.options) {
                          question.options.forEach((option: string, oIndex: number) => {
                            slide.addText(option, { x: marginX + 0.5, y: currentY + 0.5, w: contentWidth - 0.5, fontSize: 14 });
                            currentY += 0.4; // Update Y position after adding each option
                          });
                          currentY += 1; // Add space after options
                        }
                      });
                    }
                  }
                }
              });
            }
          }
        }



      });
    })
  }

  formatSectionTitle = (section: string) => {
    switch (section) {
      case 'questionbank':
        return this.translateService.instant('QUESTION BANK');
      case 'realworldscenarios':
        return this.translateService.instant('REAL WORLD SCENARIOS');
      case 'activities':
        return this.translateService.instant('ACTIVITIES');
      default:
        return this.toTitleCase(section);
    }
  };

  toTitleCase = (text: string) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
}
