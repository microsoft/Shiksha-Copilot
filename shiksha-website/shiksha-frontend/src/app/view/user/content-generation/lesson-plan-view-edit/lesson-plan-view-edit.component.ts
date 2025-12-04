import {
  Component,
  effect,
  ElementRef,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { ContentGenerationService } from '../content-generation.service';
import { UtilityService } from 'src/app/core/services/utility.service';
import { forkJoin, Subscription } from 'rxjs';
import { IdleService } from 'src/app/shared/services/idle.service';
import {
  containerAnimation,
  listAnimation,
  slideLeftRightAnimation,
} from 'src/app/shared/utility/animations.util';
import { ModalService } from 'src/app/shared/components/modal/modal.service';
import { CCE_TYPE_MAPPER } from 'src/app/shared/utility/constant.util';

@Component({
  selector: 'app-lesson-plan-view-edit',
  templateUrl: './lesson-plan-view-edit.component.html',
  styleUrls: ['./lesson-plan-view-edit.component.scss'],
  animations: [listAnimation, slideLeftRightAnimation, containerAnimation],
})
export class LessonPlanViewEditComponent implements OnInit {
  @ViewChild('contentContainer') contentContainer!: ElementRef;

  sections: any[] = [];

  planId: any;

  isLesson: any;

  editMode: any[] = [];

  activeSectionId: any;

  planDetails: any;

  activeTab = signal('');

  currentType: any;

  otherSections: any[] = [];

  videoUrls: { title: string; link: string }[] = [];

  selectedTitle: any;

  mode: any;

  modeSubscription: Subscription;

  routerEventsSubscription: Subscription;

  nextUrl: any;

  subjectDetails: any;

  feedbackValues = [
    {
      label: 'Does not meet the requirements to use it in the classroom',
      value: 'Does not meet the requirements to use it in the classroom',
    },
    {
      label: 'Needs some improvement to use in the classroom',
      value: 'Needs some improvement to use in the classroom',
    },
    {
      label: 'Very good to use in the classroom',
      value: 'Very good to use in the classroom',
    },
  ];

  feedback: any;

  feedbackReason: any;

  hasUnsavedChanges = false;

  regenerationLimitReached = false;

  submitted = false;

  isSaved = false;

  docTypeValues = [
    {
      type: 'docx',
      name: '',
      downloadType: 'planDoc',
    },
    // {
    //   type: 'ppt',
    //   name: '',
    //   downloadType: 'planPPT',
    // },
    {
      type: 'docx',
      name: '',
      downloadType: 'planChecklist',
    },
    {
      type: 'pdf',
      name: '',
      downloadType: 'planChecklistPdf',
    }
  ];

  isOpen = true;

  expandedContainer = false;

  unloadHandler = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue =
      'You have unsaved changes. Are you sure you want to leave?';
  };

  constructor(
    private activatedRoute: ActivatedRoute,
    public contentGenService: ContentGenerationService,
    public utilityService: UtilityService,
    private router: Router,
    private idleService: IdleService,
    public modalService: ModalService
  ) {
    this.planId = this.activatedRoute.snapshot.paramMap.get('id');
    this.isLesson =
      this.activatedRoute.snapshot.paramMap.get('planType') === 'lesson-plan';

    if (this.isLesson) {
      this.activeTab.set('Lesson Plan');
      this.currentType = 'Lesson Plan';
    } else {
      this.activeTab.set('Lesson Resource');
      this.currentType = 'Lesson Resource';
    }

    this.modeSubscription = this.activatedRoute.data.subscribe((data: any) => {
      this.mode = data.mode;
    });

    this.routerEventsSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.nextUrl = event.url;
      }
    });

    effect(() => {
      if (this.activeTab() === 'Videos') {
        this.otherSections = this.videoUrls;
        this.selectedTitle = this.videoUrls[0]?.title;
      } else if (this.activeTab() === 'Documents') {
        let subject;

        if (this.mode === 'generate') {
          subject = this.isLesson
            ? this.planDetails?.subject
            : this.planDetails?.subject;
        } else {
          subject = this.isLesson
            ? this.planDetails?.lesson.subject
            : this.planDetails?.resource.subject;
        }

        this.otherSections = [
          {
            title: `${
              this.isLesson ? 'Lesson Plan Docx' : 'Lesson Resource Docx'
            }`,
          },
          // {
          //   title: `${
          //     this.isLesson ? 'Lesson Plan PPT' : 'Lesson Resource PPT'
          //   }`,
          // },
          {
            title: `${
              this.isLesson && this.subjectDetails?.chapter?.board === 'KSEEB'
                ? '5E Table Docx'
                : ''
            }`,
          },
          {
            title: `${
              this.isLesson && this.subjectDetails?.chapter?.board === 'KSEEB'
                ? '5E Table PDF'
                : ''
            }`,
          }
        ];
        this.selectedTitle = this.otherSections[0].title;
        this.docTypeValues.forEach((e: any, i: any) => {
          e.name = this.otherSections[i].title;
        });
        if (!this.isLesson) {
         this.docTypeValues = this.docTypeValues.filter(
          (e: any) => !['planChecklist', 'planChecklistPdf'].includes(e.downloadType)
        );
        }
      } else {
        setTimeout(() => {
          this.scrollToSection(this.sections[0]?.id);
        }, 0);
      }
    });
  }

  ngOnInit(): void {
    switch (this.mode) {
      case 'generate':
        this.populateGenerate();
        break;

      case 'view':
        this.populateViewAndDraft();
        break;

      case 'draft':
        this.populateViewAndDraft();
        break;

      default:
        break;
    }

    this.getRegenrationLimit();

    if (this.isMobile()) {
      this.isOpen = false;
    }
  }

  ngAfterViewInit(): void {
    this.contentContainer.nativeElement.addEventListener('scroll', () => {
      this.onScroll();
    });
  }

  populateGenerate() {
    const content = this.isLesson
      ? this.contentGenService.selectedLessonPlan
      : this.contentGenService.resourcePlanData;
    if (!content) {
      this.router.navigate(['/user/content-generation']);
    } else {
      this.planDetails = content;

      this.subjectDetails = this.planDetails;

      if (this.isLesson && this.subjectDetails?.chapter?.board !== 'KSEEB') {
         this.docTypeValues = this.docTypeValues.filter(
          (e: any) => !['planChecklist', 'planChecklistPdf'].includes(e.downloadType)
        );
      }

      this.setContent();
    }
  }

  populateViewAndDraft() {
    const subscription = this.isLesson
      ? this.contentGenService.getLessonPlanById(this.planId)
      : this.contentGenService.getResourcePlanById(this.planId);

    subscription.subscribe({
      next: (res: any) => {
        const obj = {
          ...res.data,
        };
        this.planDetails = obj;
        this.subjectDetails = this.isLesson
          ? this.planDetails?.lesson
          : this.planDetails?.resource;

        if (this.isLesson && this.subjectDetails?.chapter?.board !== 'KSEEB') {
          this.docTypeValues = this.docTypeValues.filter(
          (e: any) => !['planChecklist', 'planChecklistPdf'].includes(e.downloadType)
        );
        }

        if(this.mode === 'view'){
          this.idleService.planId = this.isLesson ? this.planDetails?.lessonId : this.planDetails?.resourceId
        }
        this.setContent();
      },
      error: (err) => {},
    });
  }

  setContent() {
    let content;
    if (this.isLesson && this.planDetails?.sections) {
      content = this.planDetails?.sections;
    } else {
      content = this.planDetails.resources;

      if (this.planDetails?.additionalResources?.length) {
        const combined = content.flatMap((i: any) => {
          const match = this.planDetails.additionalResources.find(
            (e: any) => e.id === i.id
          );

          const result = [i];
          if (match) {
            result.push({ ...match, isAdditional: true });
          }
          return result;
        });

        content = combined;
      }
    }

    content.forEach(() => {
      this.editMode.push(false);
    });

    if (this.isLesson) {
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
            editable: true,
          };
        }
      });
    } else {
      this.resourceMapper(content);
    }

    if (this.isLesson && this.planDetails?.learningOutcomes?.length) {
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
    }

    this.activeSectionId = this.sections[0].id;

    const videoData =
      this.planDetails?.videos || this.planDetails?.lesson?.videos || [];

    if (videoData.length)
      this.videoUrls = videoData.map((e: any) => {
        return {
          title: e.title,
          link: this.utilityService.trustUrl(e.url),
        };
      });

    this.feedback = this.planDetails?.feedback?.feedback;
    this.feedbackReason = this.planDetails?.feedback?.overallFeedbackReason;
  }

  resourceMapper(content: any) {
    this.sections = content.map((e: any, i: any) => {
      return {
        id: e.id,
        title: e?.isAdditional ? `Additional Resources` : e.title,
        content: e.content,
        outputFormat: e.outputFormat,
        isAdditional: e?.isAdditional,
        editable: true,
      };
    });
  }

  getRegenrationLimit() {
    this.contentGenService.getRegenerationLimit().subscribe({
      next: (val: any) => {
        this.regenerationLimitReached = val?.data?.regenerationLimitReached;
      },
      error: (err) => {
        console.log(err);
      },
    });
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

  updateUnsavedChanges(val: any) {
    this.hasUnsavedChanges = val;
  }

  updateSelectedTitle(val: any) {
    this.selectedTitle = val;
  }

  chat(recordId: any, chapterId: any) {
    this.router.navigate(['/user/content-generation/lesson-chat'], {
      queryParams: { recordId, chapterId },
    });
  }

  saveEditedContent() {
    let reqBody;

    if (this.isLesson) {
      reqBody = {
        lessonId: this.planId,
        sections: this.getFormattedSectionData(),
        learningOutcomes: this.planDetails?.learningOutcomes,
      };
    } else {
      const { resources, additionalResources } = this.lessonResourceFormatter(
        this.sections
      );
      const cleanedResources = this.removeAggregateRating(resources);
      reqBody = {
        resourceId: this.planId,
        resources:cleanedResources,
        additionalResources,
        learningOutcomes: this.planDetails?.learningOutcomes,
      };
    }

    const editSubscription = this.isLesson
      ? this.contentGenService.saveLessonPlan(reqBody)
      : this.contentGenService.saveResourcePlan(reqBody);

    editSubscription.subscribe({
      next: (res) => {
        this.hasUnsavedChanges = false;
        this.utilityService.handleResponse(res);
        this.router.navigate(['/user/content-generation']);
      },
      error: (err) => {
        this.utilityService.handleError(err);
      },
    });
  }

  confirmDraft(val: any) {
    if (val === 'ok') {
      this.contentGenService.showDraftConfirmation = false;
      if (this.mode === 'view') {
        this.saveEditedContent();
      } else {
        this.save(false);
      }
    } else if (val === 'close') {
      this.contentGenService.showDraftConfirmation = false;
      this.hasUnsavedChanges = false;
      this.router.navigate([this.nextUrl]);
    } else {
      this.contentGenService.showDraftConfirmation = false;
    }
  }

  onSave() {
    this.submitted = true;
    if (!this.feedback) {
      return;
    }

    this.save(true);
  }

  save(isCompleted: boolean) {
    if (this.isLesson) {
      const lessonId =
        this.mode === 'draft' ? this.planId : this.planDetails._id;
      const data = {
        isCompleted,
        lessonId,
        feedbackPerSets: [],
        feedback: this.feedback,
        overallFeedbackReason: this.feedbackReason,
      };
      let saveTeacherData: any = {
        isCompleted,
        lessonId,
        learningOutcomes: this.planDetails?.learningOutcomes,
        isVideoSelected: this.videoUrls.length ? true : false,
      };
      saveTeacherData.sections = this.getFormattedSectionData();

      forkJoin([
        this.contentGenService.saveLessonPlan(saveTeacherData),
        this.contentGenService.createFeedback(data),
      ]).subscribe({
        next: (responses: any[]) => {
          const [lessonPlanResponse, feedbackResponse] = responses;

          const lessonPlanMessage =
            lessonPlanResponse?.message || 'Lesson plan saved successfully';
          const feedbackMessage =
            feedbackResponse?.message || 'Feedback created successfully';

          this.idleService.planId = lessonId;

          this.idleService.isCompleted = isCompleted;
          if (this.mode === 'draft') {
            this.idleService.draftId = lessonId;
          }
          if (!isCompleted) {
            this.idleService.draftId = lessonId;
          }

          this.idleService.stopWatching('lp-generation');
          this.isSaved = true;
          this.utilityService.showSuccess(lessonPlanMessage);
          this.utilityService.showSuccess(feedbackMessage);
          this.hasUnsavedChanges = false;
          if (this.planDetails.isGenerated && !isCompleted) {
            this.router.navigate(['/user/generation-status']);
          } else {
            this.router.navigate(['/user/content-generation']);
          }
        },
        error: (err: any) => {
          this.utilityService.handleError(err);
        },
      });
    } else {
      const resourceId =
        this.mode === 'draft' ? this.planId : this.planDetails._id;
      const data = {
        isCompleted,
        resourceId,
        feedbackPerSets: {},
        feedback: this.feedback,
        overallFeedbackReason: this.feedbackReason,
      };

      const { resources, additionalResources } = this.lessonResourceFormatter(
        this.sections
      );
      const cleanedResources = this.removeAggregateRating(resources);


      const body = {
        isCompleted,
        resourceId,
        resources: cleanedResources,
        additionalResources,
      };

      forkJoin([
        this.contentGenService.saveResourcePlan(body),
        this.contentGenService.createResourceFeedback(data),
      ]).subscribe({
        next: (res: any[]) => {
          this.utilityService.handleResponse(res);
          const [ResPlanResponse, feedbackResponse] = res;

          const ResPlanMessage =
            ResPlanResponse?.message || 'Resource plan saved successfully';
          const feedbackMessage =
            feedbackResponse?.message || 'Feedback created successfully';

          this.idleService.planId = resourceId;

          this.idleService.isCompleted = isCompleted;
          if (this.mode === 'draft') {
            this.idleService.draftId = resourceId;
          }
          if (!isCompleted) {
            this.idleService.draftId = resourceId;
          }
          this.idleService.stopWatching('lr-generation');
          this.isSaved = true;
          this.utilityService.showSuccess(ResPlanMessage);
          this.utilityService.showSuccess(feedbackMessage);
          this.hasUnsavedChanges = false;
          this.router.navigate(['/user/content-generation']);
        },
        error: (err) => {
          this.utilityService.handleError(err);
        },
      });
    }
  }

  removeAggregateRating(resources:any[]): any[] {
  if (!Array.isArray(resources)) return resources;

  // Find the "activities" resource
  const activities = resources.find(r => r.id === "activities");
  if (!activities?.content) return resources;

  // Remove aggregateRating from each activity
  activities.content = activities.content.map((activity: any) => {
    const { aggregateRating, ...rest } = activity; // safely removes it if it exists
    return rest;
  });

  return resources;
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

  backNavigation() {
    if (this.planDetails?.isGenerated) {
      this.router.navigate(['/user/generation-status']);
    } else {
      if (this.mode === 'generate') {
        this.router.navigate([
          this.isLesson
            ? '/user/content-generation/lesson-plan'
            : '/user/content-generation/lesson-resources',
        ]);
      } else {
        this.router.navigate(['/user/content-generation']);
      }
    }
  }

  openRegeneratePopup() {
    if (!this.feedback) {
      return;
    }
    if (this.regenerationLimitReached) {
      return;
    }
    this.modalService.showRenegenerateDialog = true;
  }

  regenerateContent(regenFeedback: any) {
    if (this.regenerationLimitReached) {
      return;
    }
    if (regenFeedback) {
      const lessonId =
        this.mode === 'draft' ? this.planId : this.planDetails._id;
      const chapterId =
        this.mode === 'draft'
          ? this.planDetails?.lesson?.chapter?._id
          : this.planDetails.chapterId;
      const isAll =
        this.mode === 'draft'
          ? this.planDetails?.lesson?.isAll
          : this.planDetails.isAll;
      const subTopics =
        this.mode === 'draft'
          ? this.planDetails?.lesson?.subTopics
          : this.planDetails.subTopics;
      const data = {
        chapterId,
        lessonId,
        isAll,
        subTopics,
        feedbackPerSets: [],
        feedback: this.feedback,
        overallFeedbackReason: this.feedbackReason,
        regenFeedback,
      };

      this.contentGenService.regenerateContent(data).subscribe({
        next: (res) => {
          this.hasUnsavedChanges = false;
          this.utilityService.handleResponse(res);
          this.modalService.showRenegenerateDialog = false;
          this.idleService.planId = lessonId;
          this.idleService.stopWatching('feedback-regeneration');
          this.router.navigate(['/user/generation-status']);
        },
        error: (err) => {
          this.utilityService.handleError(err);
          this.modalService.showRenegenerateDialog = false;
        },
      });
    }
  }

  ngOnDestroy(): void {
    this.routerEventsSubscription.unsubscribe();
    this.modeSubscription.unsubscribe();
    window.removeEventListener('beforeunload', this.unloadHandler);

    if (!this.isSaved && this.mode !== 'view') {
      this.idleService.resetIdler();
    }
  }

  lessonResourceFormatter(inputArray: any[]) {
    const resources = inputArray
      .filter((e) => !e?.isAdditional)
      .map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        outputFormat: item.outputFormat,
      }));

    const additionalResources = inputArray
      .filter((e) => e?.isAdditional)
      .map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        outputFormat: item.outputFormat,
      }));

    return { resources, additionalResources };
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

  reverseTransformChecklist(array: any[]): any {
    const result: any = {};

    array.forEach((item) => {
      const key = item.type.toLowerCase();
      result[key] = {
        activity: item.activity,
        materials: item.materials,
      };
    });

    return result;
  }

  getFormattedSectionData() {
    const sectionData = this.sections
      .filter((item) => item.title !== 'Learning Outcomes')
      .map((element) => {
        const copy = { ...element };
        delete copy.editable;

        if (copy.id === 'section_checklist') {
          copy.title = 'Checklist';
          copy.content = this.reverseTransformChecklist(copy.content);
        }

        return copy;
      });

    return sectionData;
  }
}
