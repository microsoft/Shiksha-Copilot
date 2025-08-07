import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ContentGenerationService } from '../content-generation.service';
import { ModalService } from 'src/app/shared/components/modal/modal.service';
import { Subscription, forkJoin } from 'rxjs';
import { UtilityService } from 'src/app/core/services/utility.service';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { ResourceDocxService } from 'src/app/shared/services/resource-docx-generator.service';
import { ResourcePptGeneratorService } from 'src/app/shared/services/resource-ppt-generator.service';
import { IdleService } from 'src/app/shared/services/idle.service';

@Component({
  selector: 'app-inspect-lesson-resources',
  templateUrl: './inspect-lesson-resources.component.html',
  styleUrls: ['./inspect-lesson-resources.component.scss']
})
export class InspectLessonResourcesComponent implements OnInit,OnDestroy {
  tableHeaders = ['Board', 'Medium', 'Class', 'Subject', 'Chapter', 'Sub-Topic'];
  selectedTab = 'questionbank';
  resourcePlanData: any;
  formvalues: any;
  resources: any[] = [];
  additionalResources: any[] = [];

  // resourcesTabs: any[] = [];
  tabsEditMode: any = {
    handsonactivity: false,
    questionbank: false,
    realworldscenario: false,
    videos: false,
    documents:false
  };

  additionalTabsEditMode: any = {
    handsonactivity: false,
    questionbank: false,
    realworldscenario: false,
    videos: false,
    documents:false
  };

  feedbackPerSets: any = {
    activities: { feedback: '', additionalFeedback: '' },
    questionbank: { feedback: '', additionalFeedback: '' },
    realworldscenarios: { feedback: '', additionalFeedback: '' },
  };

  teacherId: any;

  videos: any[] = [];

  resourcePlanFeedback: any;

  resourceFeedbackError:any;

  feedbackValues = [{ name: 'Irrelevant', value: 'irrelevant',symbol:'😑' }, { name: 'Moderately Relevant', value: 'moderatelyRelevant',symbol:'😐' }, { name: 'Relevant', value: 'relevant',symbol:'😊' }]

  resPlanfeedbackValues = [
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
    },
    ]


  selectedValue: string = '';

  submitted=false;

  resourcePlanfeedbackReason:any;
  resourceId:any;
  enableSave=false;

  mode:any;

  hasUnsavedChanges=false;

  routerEventsSubscription: Subscription;

  modeSubscription: Subscription;

  nextUrl:any;
  
  enableEdit=false;

  learningOutcomes: any[] = [];

  videoUrls:{title:string,link:string}[]=[]

  isSaved=false


  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
      $event.returnValue = 'You have unsaved changes';
  }

  constructor(public contentGenService: ContentGenerationService, public modalService: ModalService, public utilityService: UtilityService, private router: Router,private activatedRoute: ActivatedRoute, private resourceDocxService:ResourceDocxService, private resourcePptxService: ResourcePptGeneratorService, private idleService:IdleService) {
    this.resourceId = this.activatedRoute.snapshot.paramMap.get('id');
    this.modeSubscription = this.activatedRoute.data.subscribe((data:any)=>{
      this.mode = data.mode;
    })

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
        this.populateGenerate()
        break;
      
      case 'view':
        this.populateViewAndDraft()
        break;

      case 'draft':
        this.populateViewAndDraft()
        break;
    
      default:
        break;
    }
  }

  populateGenerate(){
    if(!this.contentGenService.resourcePlanData){
      this.router.navigate(['/user/content-generation']);
    }else{
      this.resourcePlanData = this.contentGenService.resourcePlanData;
      this.formvalues = this.contentGenService.resourcePlanData;
      this.resources = this.resourcePlanData.resources;
      this.additionalResources = this.resourcePlanData.additionalResources;
      this.learningOutcomes = this.resourcePlanData?.learningOutcomes;
      if(this.resourcePlanData?.videos)
        this.videoUrls = this.resourcePlanData.videos.map((e:any)=> 
      {
        return {title:e.title, link:this.utilityService.trustUrl(e.url)}
      })
    }
  }

  populateViewAndDraft(){
    this.contentGenService.getResourcePlanById(this.resourceId).subscribe({
      next: (res: any) => {        
        
        const obj = {
          ...res.data,
        };
        if (obj.instructionSet.length > 0) {
          obj.lesson.instructionSet = obj.instructionSet;
        }
        // this.selectedLessonPlan = obj;
        const addonObj = {
          board: res.data.resource.chapter.board,
          medium: res.data.resource.chapter.medium,
          topics: `${res.data.resource.chapter.orderNumber}. ${res.data.resource.chapter.topics}`,
          subtopics: res.data.resource.chapter.subTopics,
        };
        const formObj = {
          ...res.data.resource,
          ...addonObj,
        };
        this.formvalues = formObj;
        this.feedbackPerSets = res.data.feedback.feedbackPerSets;
        this.resourcePlanfeedbackReason=res.data.feedback.overallFeedbackReason;
        this.resourcePlanFeedback=res.data.feedback.feedback
        this.resourcePlanData = res.data;
        this.resources = res.data.resources;
        this.additionalResources = res.data.additionalResources;
        this.enableSave = this.checkSave();
        this.learningOutcomes = res?.data?.resource?.learningOutcomes

        if(this.resourcePlanData?.resource?.videos)
          this.videoUrls = this.resourcePlanData?.resource?.videos.map((e:any)=> 
        {
          return {title:e.title, link:this.utilityService.trustUrl(e.url)}
        })
      },
      error: (err) => {
        this.utilityService.handleError(err);
      },
    });

    if(this.mode === 'view'){
      this.idleService.planId = this.resourceId
    }
  }

  onModifyContent() {
    const data = {
      resourceId: this.resourcePlanData._id,
      resources: this.resources,
    };
    this.contentGenService.modifyContent(data).subscribe({
      next: (res) => {
        this.utilityService.handleResponse(res)
      },
      error: (err) => {
        this.utilityService.handleError(err)
      },
    });
  }

  toggleEditMode(tabName: string): void {
    this.enableEdit=true;
    this.hasUnsavedChanges=true
    this.tabsEditMode[tabName] = !this.tabsEditMode[tabName];
  }

  additionalToggleEditMode(tabName: string): void {
    this.enableEdit=true;
    this.hasUnsavedChanges=true
    this.additionalTabsEditMode[tabName] = !this.additionalTabsEditMode[tabName];
  }

  selectTab(tabName: string): void {
    this.selectedTab = tabName;
  }

  getDisplayMethodOfTeaching(method: string): string {
    const mapping:{ [key: string]: string } = {
      activities: 'Activities',
      questionbank: 'Questions',
      realworldscenarios: 'Real World Scenarios',
    };
    return mapping[method] || method;
  }

  onFeedbackChange(method: string, value: string) {
    this.hasUnsavedChanges = true;
    if (value === 'relevant') {
      this.feedbackPerSets[method].additionalFeedback = '';
    } else {
      this.feedbackPerSets[method].additionalFeedback = this.feedbackPerSets[method].additionalFeedback || '';
    }
    this.enableSave = this.checkSave();
  }

  checkSave() {
    for (let key in this.feedbackPerSets) {
      if (!this.feedbackPerSets[key].feedback) {
        return false;
      }
    }
    return true;
  }
  resourcePlanFeedbackChanged(feedbackValue:string){
    this.hasUnsavedChanges = true;
    this.resourceFeedbackError=null
     if (feedbackValue !== 'Very good to use in the classroom') {
      this.resourcePlanfeedbackReason = this.resourcePlanfeedbackReason || '';
    } else {
      this.resourcePlanfeedbackReason = '';
    }
  }
  
  onSave() {
    this.submitted = true;
    const allFeedbackProvided = Object.keys(this.feedbackPerSets).every(key => {
      return this.feedbackPerSets[key].feedback;
    });
  
    if (!allFeedbackProvided) {
      this.utilityService.showError('Please provide all tabs feedback.');
      return;
    }
    
    for (let key in this.feedbackPerSets) {
      if(this.feedbackPerSets[key].feedback !== this.feedbackValues[2].value && !this.feedbackPerSets[key].additionalFeedback){
        this.utilityService.showError('Please specify your feedback reasons in the tabs marked Moderately Relevant and Irrelevant.')
        return
      }
    }

    if(!this.resourcePlanFeedback){
      this.resourceFeedbackError = 'Please provide lesson resource feedback';
      return
    }

    if(this.resourcePlanFeedback !== this.resPlanfeedbackValues[2].value && !this.resourcePlanfeedbackReason){
      return
    }
    this.save(true)
  }

  save(isCompleted:boolean){
    const resourceId = this.mode === 'draft' ? this.resourceId : this.resourcePlanData._id
    const data = {
      isCompleted,
      resourceId,
      feedbackPerSets: this.feedbackPerSets,
      feedback: this.resourcePlanFeedback,
      overallFeedbackReason:this.resourcePlanfeedbackReason
    };

    const body = {
      isCompleted,
      resourceId,
      resources: this.resources,
      additionalResources:this.additionalResources
    };

    forkJoin([
      this.contentGenService.saveResourcePlan(body),
      this.contentGenService.createResourceFeedback(data)
    ])
      .subscribe({
        next: (res: any[]) => {
          this.utilityService.handleResponse(res);
          const [ResPlanResponse, feedbackResponse] = res;
  
        const ResPlanMessage = ResPlanResponse?.message || 'Resource plan saved successfully';
        const feedbackMessage = feedbackResponse?.message || 'Feedback created successfully';

       this.idleService.planId = this.mode === 'draft' ? this.resourceId : this.resourcePlanData._id

        this.idleService.isCompleted = isCompleted;
        if(this.mode === 'draft'){
          this.idleService.draftId = this.resourceId 
        }
        if(!isCompleted){
          this.idleService.draftId = this.mode === 'draft' ? this.resourceId : this.resourcePlanData._id;
        }
        this.idleService.stopWatching('lr-generation');
        this.isSaved = true
        this.utilityService.showSuccess(ResPlanMessage);
        this.utilityService.showSuccess(feedbackMessage);
        this.hasUnsavedChanges=false;
        this.router.navigate(['/user/content-generation']);
        },
        error: (err) => {
          this.utilityService.handleError(err);
        }
      })
  }

  saveEdited(){
    const body = {
      resourceId:this.resourceId,
      resources: this.resources,
      additionalResources:this.additionalResources
    };

    this.contentGenService.saveResourcePlan(body).
    subscribe({
      next:(res)=>{
        this.utilityService.handleResponse(res);
        this.hasUnsavedChanges=false;
        this.router.navigate(['/user/content-generation']);
      },
      error:(err)=>{
        this.utilityService.handleError(err);
      }
    })
  }

  downloadDocx() {
    if(this.mode !=='view'){
      return
    }
    this.resourceDocxService.generateDocx(this.resources, this.formvalues, this.learningOutcomes)
  }

  downloadAdditionalDocx(){
    if(this.mode !=='view'){
      return
    }
    this.resourceDocxService.generateDocx(this.additionalResources, this.formvalues, this.learningOutcomes)
  }

  showEditBtn(data:any,tabName:any){
    if(tabName === 'activities'){
      return true
    }
    let hasContent=false
      data.forEach((ele:any) => {
        if(ele.content && ele.content.length){
          hasContent = true
        }
      });
    return hasContent
  }


  confirmDraft(val:any){
    if(val === 'ok'){
      this.contentGenService.showDraftConfirmation = false;
      if(this.mode === 'view'){
        this.saveEdited()
      }else{
        this.save(false);
      }
    }else if(val==='close'){
      this.contentGenService.showDraftConfirmation=false;
      this.hasUnsavedChanges=false;
      this.router.navigate([this.nextUrl])
    }
    else{
      this.contentGenService.showDraftConfirmation=false;
    }
  }

  backNavigation(){
      if(this.mode === 'generate'){
        this.router.navigate(['/user/content-generation/lesson-resources']);
      }else{
        this.router.navigate(['/user/content-generation']);
      }
  }
  
  generatePresentation() {
    if(this.mode !=='view'){
      return
    }
    this.resourcePptxService.generatePpt(this.resources, this.formvalues, this.learningOutcomes);
  }

  generateAdditionalResourcePresentation(){
    if(this.mode !=='view'){
      return
    }
    this.resourcePptxService.generatePpt(this.additionalResources, this.formvalues, this.learningOutcomes);
  }

  trackByFn(index: number, item: any): number {
    return index;
  }

  ngOnDestroy(): void {
    this.routerEventsSubscription.unsubscribe();
    this.modeSubscription.unsubscribe();
    if(!this.isSaved && this.mode !== 'view'){
      this.idleService.resetIdler();
    }
  }
}
