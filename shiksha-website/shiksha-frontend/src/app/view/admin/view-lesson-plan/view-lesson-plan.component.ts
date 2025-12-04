import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContentActivityService } from '../content-activity/content-activity.service';
import { UtilityService } from 'src/app/core/services/utility.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ContentGenerationModule } from '../../user/content-generation/content-generation.module';
import { CCE_TYPE_MAPPER } from 'src/app/shared/utility/constant.util';

@Component({
  selector: 'app-view-lesson-plan',
  standalone: true,
  imports: [CommonModule, ContentGenerationModule],
  templateUrl: './view-lesson-plan.component.html',
  styleUrls: [
    './view-lesson-plan.component.scss',
    '../../user/content-generation/lesson-plan-view-edit/lesson-plan-view-edit.component.scss',
  ],
})
export class ViewLessonPlanComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild('contentContainer') contentContainer!: ElementRef;

  sections: any[] = [];

  planId: any;

  activeSectionId: any;

  planDetails: any;

  activeTab = signal('');

  expandedContainer = false;

  isOpen = true;

  subjectDetails: any;

  lessonPlanId: string | null = null;

  routeSubs!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private contentActService: ContentActivityService,
    public utilityService: UtilityService
  ) {
    this.activeTab.set('Lesson Plan');
  }

  ngOnInit(): void {
    this.routeSubs = this.route.paramMap.subscribe((params) => {
      this.lessonPlanId = params.get('id');
      if (this.lessonPlanId) {
        this.getLessonPlanDetails(this.lessonPlanId);
      }
    });
    if (this.isMobile()) {
      this.isOpen = false;
    }
  }

  ngAfterViewInit(): void {
    this.contentContainer.nativeElement.addEventListener('scroll', () => {
      this.onScroll();
    });
  }

  isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  toggleAccordion() {
    if (this.isMobile()) {
      this.isOpen = !this.isOpen;
    }
  }

  toggleContainer() {
    this.expandedContainer = !this.expandedContainer;
  }

  scrollToSection(sectionId: string): void {
    const sectionEl = document.getElementById(sectionId);
    const containerEl = this.contentContainer?.nativeElement;

    if (sectionEl && containerEl) {
      const offset = sectionEl.offsetTop;
      const scrollOffset = 50;

      containerEl.scrollTo({
        top: offset - scrollOffset,
        behavior: 'smooth',
      });
    }
  }

  onScroll() {
    const scrollTop = this.contentContainer.nativeElement.scrollTop;
    const offsets = this.sections.map((section) => {
      const el = document.getElementById(section.id);
      return {
        id: section.id,
        offset: el ? el.offsetTop : 0,
      };
    });

    const visible = offsets
      .slice()
      .reverse()
      .find((o) => scrollTop + 170 >= o.offset);

    if (visible && visible.id !== this.activeSectionId) {
      this.activeSectionId = visible.id;
    }
  }

  getLessonPlanDetails(id: any) {
    this.contentActService.getLessonPlanDetFrmContentActivity(id).subscribe({
      next: (res: any) => {
        console.log(res);
        this.planDetails = res.data[0];
        this.subjectDetails = this.planDetails;
        this.setContent();
      },
      error: (err) => {
        this.utilityService.handleError(err);
      },
    });
  }

  setContent() {
    this.sections = this.planDetails.sections.map((section: any) => {
      if (section.id === 'section_checklist') {
        return {
          id: section.id,
          title: 'Lesson Summary',
          outputFormat: section?.outputFormat,
          content: this.transformChecklist(section.content),
          editable: false,
        };
      } else {
        return {
          ...section,
          editable: false,
        };
      }
    });

    let lo = this.planDetails.learningOutcomes
      .map((item: any) => `- ${item}`)
      .join('\n');

    this.sections.unshift({
      id: 'learning_outcome',
      title: 'Learning Outcomes',
      content: lo,
      outputFormat: 'plain_text',
      editable: false,
    });

    this.activeSectionId = this.sections[0].id;
  }

  transformChecklist(content: any): any[] {
    const steps = ['engage', 'explore', 'explain', 'elaborate', 'evaluate'];
    const subjectName =
      this.planDetails?.subjects?.name ||
      this.planDetails?.lesson?.subjects.name;
    const medium =
      this.planDetails?.chapter?.medium ||
      this.planDetails?.lesson?.chapter?.medium;
    const cceToolMapper: any = this.utilityService.getCceTools(
      CCE_TYPE_MAPPER[subjectName],
      medium
    );
    return steps
      .filter((step) => content[step])
      .map((step) => ({
        type: step.toUpperCase(),
        activity: content[step].activity,
        materials: content[step].materials,
        cceTools: cceToolMapper[step.toUpperCase()],
      }));
  }

  ngOnDestroy(): void {
    this.routeSubs.unsubscribe();
  }
}
