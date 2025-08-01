import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalService } from 'src/app/shared/components/modal/modal.service';
import { ContentGenerationService } from '../content-generation.service';
import { UtilityService } from 'src/app/core/services/utility.service';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { LessonDocxGeneratorService } from 'src/app/shared/services/lesson-docx-generator.service';
import { LessonPPTGeneratorService } from 'src/app/shared/services/lesson-ppt-generator.service';
import { IdleService } from 'src/app/shared/services/idle.service';

interface LessonPlanTabs {
  info: InfoType[];
  type: string;
}

interface InfoType {
  methodOfTeaching: string;
  content: {
    main: any;
  };
}
@Component({
  selector: 'app-inspect-lesson-plan',
  templateUrl: './inspect-lesson-plan.component.html',
  styleUrls: ['./inspect-lesson-plan.component.scss'],
})
export class InspectLessonPlanComponent implements OnInit, OnDestroy {
  selectedTab = 'Learning Outcomes';
  tableHeaders = [
    'Board',
    'Medium',
    'Class',
    'Subject',
    'Chapter',
    'Sub-Topic',
  ];
  teacherId: any;

  formvalues: any = {};
  selectedLessonPlan: any;

  tabsEditMode: any = {
    learningOutcomes: false,
    engage: false,
    explore: false,
    explain: false,
    elaborate: false,
    evaluate: false,
    documents: false,
  };

    inAppFeedback: any = [
      {
        type:'learningObjectives',
        questions:[
          { question:'The lesson objectives provided are clear, appropriate, measurable, and aligned with the curriculum.', feedback: '' },
        ]
      },
      {
        type:'Engage',
        questions:[
          { question:'The content elicits students’ prior knowledge based on the learning objectives.', feedback: '' },
          { question:'The content raises student interest/motivation to learn the topic.', feedback: '' }
        ]
      },
      {
        type:'Explore',
        questions:[
          { question:'The activities are appropriate to the student levels and the learning objectives.', feedback: '' },
          { question:'The activities are doable in classrooms without any resource constraints.', feedback: '' }
        ]
      },
      {
        type:'Explain',
        questions:[
          { question:'The content has questions to lead interactive discussions in the classroom.', feedback: '' },
          { question:'The content includes different approaches such as audio-visual resources, activities, or field visits to explain and illustrate the concept(s) and/or skill(s).', feedback: '' }
        ]
      },
      {
        type:'Elaborate',
        questions:[
          { question:'The activities provide students with the opportunity to apply the newly acquired concept(s) and/or skill(s) in new areas.', feedback: '' },
          { question:'The activities encourage students to find real-life connections with the newly acquired concept(s) and/or skill(s).', feedback: '' }
        ]
      },
      {
        type:'Evaluate',
        questions:[
          { question:'The content helps check how well the student understands the concept taught.', feedback: '' }
        ]
      }
      
    ]

  inAppFeedbackValues = [{name:'Strongly Disagree',symbol:'😠'},{name:'Disagree',symbol:'😕'},{name:'Neutral',symbol:'😐'},{name:'Agree',symbol:'🙂'},{name:'Strongly Agree',symbol:'😃'}]

  tabs: LessonPlanTabs[] = [];

  learningOutcomes: any[] = [];

  learningDocuments: any[] = [];

  lessonPlanFeedback: any;

  lessonPlanfeedbackValues = [
    {
      label:'Does not meet the requirements to use it in the classroom',
      value:'Does not meet the requirements to use it in the classroom'
    },
    {
      label:'Needs some improvement to use in the classroom',
      value:'Needs some improvement to use in the classroom'
    },
    {
      label:'Very good to use in the classroom',
      value:'Very good to use in the classroom'
    }
  ];
  desiredOrder = ['Engage', 'Explore', 'Explain', 'Elaborate', 'Evaluate'];

  combinedLearningOutcomes!: string;

  lessonPlanfeedbackReason: any;

  submitted = false;

  lessonId: any;

  enableRegenerate = false;

  mode: any;

  hasUnsavedChanges = false;

  routerEventsSubscription: Subscription;

  modeSubscription: Subscription;

  nextUrl: any;

  enableEdit= false;


  videoUrls:{title:string,link:string}[]=[];

  isSaved=false

  regenerationLimitReached = false;


  unloadHandler = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
};
  
  constructor(
    public modalService: ModalService,
    public contentGenerationService: ContentGenerationService,
    public utilityService: UtilityService,
    private router: Router,
    private contentGenService: ContentGenerationService,
    private activatedRoute: ActivatedRoute,
    private lessonDocxGeneratorService: LessonDocxGeneratorService,
    private lessonPPTGeneratorService: LessonPPTGeneratorService,
    private idleService:IdleService
  ) {
    this.lessonId = this.activatedRoute.snapshot.paramMap.get('id');
    this.modeSubscription = this.activatedRoute.data.subscribe((data: any) => {
      this.mode = data.mode;
    });

    this.routerEventsSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.nextUrl = event.url;
      }
    });
  }

  ngOnInit(): void {
    const data: string = localStorage.getItem('userData') ?? '';
    const loggedInUser = JSON.parse(data);
    this.teacherId = loggedInUser._id;
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
    window.addEventListener('beforeunload', this.unloadHandler);
    this.getRegenrationLimit()
  }

  getRegenrationLimit(){
    this.contentGenService.getRegenerationLimit().
    subscribe({
      next:(val:any)=>{
        console.log(val);
        this.regenerationLimitReached = val?.data?.regenerationLimitReached
      },
      error:(err)=>{
        console.log(err);
      }
    })
  }

  populateGenerate() {
    if(!this.contentGenService.selectedLessonPlan){
      this.router.navigate(['/user/content-generation']);
    }else{
      this.formvalues = this.contentGenService.selectedLessonPlan;
      this.selectedLessonPlan = this.contentGenService.selectedLessonPlan;
      this.tabs = [...this.selectedLessonPlan.instructionSet];
      this.learningOutcomes = this.selectedLessonPlan.learningOutcomes;
      this.learningDocuments = this.selectedLessonPlan.docUrls;
      this.orderTabs();
      if(this.selectedLessonPlan?.videos)
      this.videoUrls = this.selectedLessonPlan.videos.map((e:any)=> 
    {
      return {title:e.title, link:this.utilityService.trustUrl(e.url)}
    })
    
    }
  }

  populateViewAndDraft() {
    this.contentGenService.getLessonPlanById(this.lessonId).subscribe({
      next: (res: any) => {
        const obj = {
          ...res.data,
        };
        if (obj.instructionSet.length > 0) {
          obj.lesson.instructionSet = obj.instructionSet;
        }
        this.selectedLessonPlan = obj;
        const addonObj = {
          board: res.data.lesson.chapter.board,
          medium: res.data.lesson.chapter.medium,
          topics: `${res.data.lesson.chapter.orderNumber}. ${res.data.lesson.chapter.topics}`,
          subtopics: res.data.lesson.subTopics,
        };
        const formObj = {
          ...res.data.lesson,
          ...addonObj,
        };
        this.formvalues = formObj;
        this.tabs = [...this.selectedLessonPlan.instructionSet];
        this.learningOutcomes = this.selectedLessonPlan.learningOutcomes;
        this.learningDocuments = this.selectedLessonPlan.docUrls;
        if (Array.isArray(res.data.feedback.feedbackPerSets)) {
          this.inAppFeedback = res.data.feedback.feedbackPerSets;
        }
        this.lessonPlanfeedbackReason = res.data.feedback.overallFeedbackReason;
        this.lessonPlanFeedback = res.data.feedback.feedback;
        // this.enableRegenerate = this.checkRegenerate()
        this.orderTabs();

        if(this.selectedLessonPlan?.lesson.videos)
          this.videoUrls = this.selectedLessonPlan?.lesson?.videos.map((e:any)=> 
        {
          return {title:e.title, link:this.utilityService.trustUrl(e.url)}
        })
      },
      error: (err) => {
        this.utilityService.handleError(err);
      },
    });

    if(this.mode === 'view'){
      this.idleService.planId = this.lessonId
    }
  }

  orderTabs() {
    this.tabs.sort((a, b) => {
      return (
        this.desiredOrder.indexOf(a.type) - this.desiredOrder.indexOf(b.type)
      );
    });
    this.combineLearningOutcomes();
  }

  selectTab(tabName: string): void {
    this.selectedTab = tabName;
  }

  lessonFeedbackChanged(feedbackValue: string) {
    this.hasUnsavedChanges = true;

    // if (feedbackValue !== 'Very good to use in the classroom') {
    //   this.lessonPlanfeedbackReason = this.lessonPlanfeedbackReason || '';
    // } else {
    //   this.lessonPlanfeedbackReason = '';
    // }
  }

  combineLearningOutcomes(): void {
    this.combinedLearningOutcomes = this.learningOutcomes
      .map((outcome, index) => `${index + 1}. ${outcome}`)
      .join('\n');
  }

  splitLearningOutcomes(): void {
    this.learningOutcomes = this.combinedLearningOutcomes
      .split('\n')
      .map((outcome) => outcome.replace(/^\d+\.\s*/, ''));
  }

  toggleEditMode(tabType: string): void {
    this.enableEdit = true;
    this.hasUnsavedChanges = true;
    if (tabType === 'learningOutcomes' && this.tabsEditMode[tabType]) {
      this.splitLearningOutcomes();
    }
    this.tabsEditMode[tabType] = !this.tabsEditMode[tabType];
  }

  openRegeneratePopup() {
    // if(!this.enableRegenerate){
    //   return
    // }
    // if (!this.isTabFeedbackReson()) {
    //   return;
    // }
    // if (!this.lessonPlanfeedbackReason) {
    //   this.utilityService.showError('Please provide lesson plan feedback');
    //   return;
    // }
    if (!this.lessonPlanFeedback) {
      return;
    }

    if(this.regenerationLimitReached){
      return;
    }
    this.modalService.showRenegenerateDialog = true;
  }

  onModifyContent() {
    const data = {
      teacherId: this.teacherId,
      lessonId: this.selectedLessonPlan._id,
      instructionSet: this.tabs,
      overallFeedbackReason: this.lessonPlanfeedbackReason,
    };
    this.contentGenerationService.modifyContent(data).subscribe({
      next: (res) => {
        this.utilityService.handleResponse(res);
      },
      error: (err) => {
        this.utilityService.handleError(err);
      },
    });
  }

  onFeedbackChange() {
    this.hasUnsavedChanges = true;
  }

  // checkRegenerate() {
  //   for (let key in this.feedbackPerSets) {
  //     if (this.feedbackPerSets[key].feedback && this.feedbackPerSets[key].feedback !== 'relevant') {
  //       return true;
  //     }
  //   }
  //   return false;
  // }

  // isTabFeedbackReson() {
  //   for (let key in this.feedbackPerSets) {
  //     if (
  //       this.feedbackPerSets[key].feedback !== this.feedbackValues[0].value &&
  //       !this.feedbackPerSets[key].additionalFeedback
  //     ) {
  //       this.utilityService.showError(
  //         'Please specify your feedback reasons in the tabs marked Moderately Relevant and Irrelevant.'
  //       );
  //       return false;
  //     }
  //   }
  //   return true;
  // }

  onSave() {
    this.submitted = true;
    if (!this.lessonPlanFeedback) {
      return;
    }

    this.save(true);
  }

  save(isCompleted: boolean) {
    const lessonId =
      this.mode === 'draft' ? this.lessonId : this.selectedLessonPlan._id;
    const data = {
      isCompleted,
      lessonId,
      feedbackPerSets: this.inAppFeedback,
      feedback: this.lessonPlanFeedback,
      overallFeedbackReason: this.lessonPlanfeedbackReason,
    };
    const saveTeacherData = {
      isCompleted,
      lessonId,
      instructionSet: this.tabs,
      learningOutcomes: this.learningOutcomes,
      isVideoSelected:this.videoUrls.length ? true : false
    };

    forkJoin([
      this.contentGenService.saveLessonPlan(saveTeacherData),
      this.contentGenerationService.createFeedback(data),
    ]).subscribe({
      next: (responses: any[]) => {
        const [lessonPlanResponse, feedbackResponse] = responses;

        const lessonPlanMessage =
          lessonPlanResponse?.message || 'Lesson plan saved successfully';
        const feedbackMessage =
          feedbackResponse?.message || 'Feedback created successfully';

          this.idleService.planId = this.mode === 'draft' ? this.lessonId : this.selectedLessonPlan._id;

          this.idleService.isCompleted = isCompleted;
          if(this.mode === 'draft'){
            this.idleService.draftId = this.lessonId
          }
          if(!isCompleted){
            this.idleService.draftId = this.mode === 'draft' ? this.lessonId : this.selectedLessonPlan._id;
          }

        this.idleService.stopWatching('lp-generation');
        this.isSaved = true
        this.utilityService.showSuccess(lessonPlanMessage);
        this.utilityService.showSuccess(feedbackMessage);
        this.hasUnsavedChanges = false;
        if(this.selectedLessonPlan.isGenerated && !isCompleted){
          this.router.navigate(['/user/generation-status']);
        }else{
          this.router.navigate(['/user/content-generation']);
        }
      },
      error: (err: any) => {
        this.utilityService.handleError(err);
      },
    });
  }

  saveEdited() {
    const saveTeacherData = {
      lessonId: this.lessonId,
      instructionSet: this.tabs,
      learningOutcomes: this.learningOutcomes,
    };
    this.contentGenService.saveLessonPlan(saveTeacherData).subscribe({
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

  regenerateContent(regenFeedback: any) {
    if(this.regenerationLimitReached){
      return;
    }
    if (regenFeedback) {
      const lessonId =
        this.mode === 'draft' ? this.lessonId : this.selectedLessonPlan._id;
      const chapterId =
        this.mode === 'draft'
          ? this.selectedLessonPlan?.lesson?.chapter?._id
          : this.selectedLessonPlan.chapterId;
      const isAll =
        this.mode === 'draft'
          ? this.selectedLessonPlan?.lesson?.isAll
          : this.selectedLessonPlan.isAll;
      const subTopics =
        this.mode === 'draft'
          ? this.selectedLessonPlan?.lesson?.subTopics
          : this.selectedLessonPlan.subTopics;
      const data = {
        chapterId,
        lessonId,
        isAll,
        subTopics,
        feedbackPerSets: this.inAppFeedback,
        feedback: this.lessonPlanFeedback,
        overallFeedbackReason: this.lessonPlanfeedbackReason,
        regenFeedback
      };

      this.contentGenService.regenerateContent(data).subscribe({
        next: (res) => {
          this.hasUnsavedChanges = false;
          this.utilityService.handleResponse(res);
          this.modalService.showRenegenerateDialog = false;
          this.idleService.planId = this.mode === 'draft' ? this.lessonId : this.selectedLessonPlan._id;
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

  showEditBtn(data: any) {
    let hasContent = false;
    data.forEach((ele: any) => {
      if (ele.content && ele.content.length) {
        hasContent = true;
      }
    });
    return hasContent;
  }

  downloadDocx() {
    if(this.mode !=='view'){
      return
    }
    const checkList:any[] =  this.mode === 'generate'
    ? this.selectedLessonPlan?.checkList
    : this.selectedLessonPlan?.lesson?.checkList
    this.lessonDocxGeneratorService.generateDocx(this.tabs, this.formvalues, checkList, this.learningOutcomes);
  }

  confirmDraft(val: any) {
    if (val === 'ok') {
      this.contentGenService.showDraftConfirmation = false;
      if (this.mode === 'view') {
        this.saveEdited();
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

  generatePpt() {
    if(this.mode !=='view'){
      return
    }
    const checkList:any[] =  this.mode === 'generate'
    ? this.selectedLessonPlan?.checkList
    : this.selectedLessonPlan?.lesson?.checkList
    this.lessonPPTGeneratorService.generatePpt(this.tabs,this.formvalues,checkList, this.learningOutcomes);
  }

  backNavigation(){
    if(this.selectedLessonPlan.isGenerated){
      this.router.navigate(['/user/generation-status']);
    }else{
      if(this.mode === 'generate'){
        this.router.navigate(['/user/content-generation/lesson-plan']);
      }else{
        this.router.navigate(['/user/content-generation']);
      }
    }
  }

  trackByFn(index: number, item: any): number {
    return index;
  }
  
  downloadLPDetails(){
    if(this.mode !=='view'){
      return
    }
    const lessonId = this.mode === 'generate' ? this.selectedLessonPlan._id: this.lessonId;
    this.contentGenService.downloadLPDetails(lessonId).
    subscribe({
      next:(res)=>{
      window.removeEventListener('beforeunload', this.unloadHandler);
      const link = document.createElement('a');
      link.href = res?.data?.url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.addEventListener('beforeunload', this.unloadHandler);
      this.utilityService.showSuccess('5E table downloaded successfully!')
      },
      error:(err)=>{
        window.addEventListener('beforeunload', this.unloadHandler);
        this.utilityService.handleError(err);
      }
    })
  }

  chat(recordId:any, chapterId:any){
    this.router.navigate(['/user/content-generation/lesson-chat'],{queryParams:{recordId,chapterId}})
  }

  ngOnDestroy(): void {
    this.routerEventsSubscription.unsubscribe();
    this.modeSubscription.unsubscribe();
    window.removeEventListener('beforeunload', this.unloadHandler);

    if(!this.isSaved && this.mode !== 'view'){
      this.idleService.resetIdler();
    }

  }
}
