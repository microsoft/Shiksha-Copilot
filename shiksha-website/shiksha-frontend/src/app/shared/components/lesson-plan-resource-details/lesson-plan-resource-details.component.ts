import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  AbstractControl,
  UntypedFormControl,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { UtilityService } from 'src/app/core/services/utility.service';
import { ContentGenerationService } from 'src/app/view/user/content-generation/content-generation.service';
import { FormDropDownConfig } from '../../interfaces/form-dropdown.interface';
import { ModalService } from '../modal/modal.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormDropdownComponent } from '../form-dropdown/form-dropdown.component';
import { Observable } from 'rxjs';
import { DeleteDetailComponent } from '../delete-detail/delete-detail.component';
import { HttpParams } from '@angular/common/http';
import { HasPermissionDirective } from 'src/app/core/directives/has-permission.directive';
import { IdleService } from '../../services/idle.service';

export interface LessonTypeConfig {
  [key: string]: {
    type: string;
    inspectUrl: string;
  };
}

@Component({
  selector: 'app-lesson-plan-resource-details',
  templateUrl: './lesson-plan-resource-details.component.html',
  styleUrls: ['./lesson-plan-resource-details.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    CommonModule,
    ReactiveFormsModule,
    FormDropdownComponent,
    DeleteDetailComponent,
    FormsModule,
    HasPermissionDirective,
  ],
})
export class LessonPlanResourceDetailsComponent implements OnInit, OnDestroy {
  showConfirmPopup!: boolean;
  heading: string = 'Confirm';
  confirmText: string =
    'Selected combination does not include videos. Do you want to continue ?';
  lessonType!: string;
  lessonForm!: FormGroup;
  lessonSubscriber!: Observable<any>;
  submitted: boolean = false;
  radioBtn: any = [
    { value: true, name: 'Yes' },
    { value: false, name: 'No' },
  ];
  isEditable: boolean = false;

  classDropdownOptions: any[] = [];
  subjectDropdownOptions: any[] = [];
  topicsDropdownOptions: any[] = [];
  subtopicsDropdownOptions: any[] = [];
  mediumDropdownOptions: any[] = [];
  boardDropdownOptions: any[] = [];

  mediumDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Medium',
    height: 'auto',
    fieldName: 'Medium',
    bindLable: 'medium',
    bindValue: 'medium',
    required: true,
  };

  boardDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Board',
    height: 'auto',
    fieldName: 'Board',
    bindLable: 'board',
    bindValue: 'board',
    required: true,
  };

  classDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Class',
    height: 'auto',
    fieldName: 'Class',
    bindLable: 'class',
    bindValue: 'class',
    required: true,
  };

  semesterDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Semester1',
    height: 'auto',
    fieldName: 'Semester',
    bindLable: 'semester',
    bindValue: 'semester',
    required: true,
  };

  subjectDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Subject',
    height: 'auto',
    fieldName: 'Subject',
    bindLable: 'displayName',
    bindValue: 'subject',
    required: true,
  };

  topicsDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Chapter',
    height: 'auto',
    fieldName: 'Chapter',
    bindLable: 'displayValue',
    bindValue: 'displayValue',
    required: true,
  };

  subtopicsDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Subtopic',
    height: 'auto',
    fieldName: 'Sub-Topic',
    bindLable: 'label',
    bindValue: 'label',
    required: true,
  };

  teachingModels = ['model-1', 'model-2', 'model-3'];

  checkboxOptions = [
    { value: 'beginner', label: 'Beginner', checked: true },
    { value: 'intermediate', label: 'Intermediate', checked: true },
    { value: 'advanced', label: 'Advanced', checked: true },
  ];

  medium!: string;
  board!: string;
  data: any[] = [];

  showDraftPopup!: boolean;

  draftDetails = {
    type: '',
    id: '',
  };

  draftPopupConfig = {
    heading: this.translateService.instant('Draft Exists'),
    confirmText: this.translateService.instant('A draft already exists for the selected combination. Would you like to proceed with editing it?'),
  };

  lessonTypeConfig: LessonTypeConfig = {
    '/user/content-generation/lesson-plan': {
      type: 'plan',
      inspectUrl: '/user/content-generation/inspect-lesson-plan',
    },
    '/user/content-generation/lesson-resources': {
      type: 'resource',
      inspectUrl: '/user/content-generation/inspect-lesson-resources',
    },
  };

  learningOutcomes: any;
  combinedLearningOutcomes: any;
  planId: any;

  initialLearningOutcomes: any;
  generateNew = false;

  chapterId: any;
  selectedSubtopic: any;
  submitBtnTxt:any;

  isGenerate = false;

  selectedMedium:any;

  regenerationLimitReached = false;

  constructor(
    private fb: FormBuilder,
    public modalService: ModalService,
    private contentGenService: ContentGenerationService,
    private router: Router,
    private utilityservice: UtilityService,
    private translateService:TranslateService,
    private idleService:IdleService
  ) {
    this.lessonType = this.router.url;
  }

  ngOnInit(): void {
    this.initializeForm();
    const data: string = localStorage.getItem('userData') ?? '';
    const loggedInUser = JSON.parse(data);
    this.getBoardsList(loggedInUser);
    this.submitBtnTxt = this.getLessonType()?.type === 'plan' ? 'Generate Lesson Plan':'Generate Lesson Resources'
    this.getRegenrationLimit()
  }

  getRegenrationLimit(){
    this.contentGenService.getRegenerationLimit().
    subscribe({
      next:(val:any)=>{
        this.regenerationLimitReached = val?.data?.regenerationLimitReached
      },
      error:(err)=>{
        console.log(err);
      }
    })
  }

  getBoards(): string {
    return this.boardDropdownOptions.map((item) => item.board).join(', ');
  }

  getBoardsList(userDetails: any) {
    let classList = [];
    classList = this.utilityservice.formatResponse(userDetails.classes);
    this.boardDropdownOptions = classList;

    if (classList.length === 1) {
      this.f.board.setValue(classList[0].board);

      if (classList[0].mediums.length === 1) {
        this.f.medium.setValue(classList[0].mediums[0].medium);
        this.selectedMedium = classList[0].mediums[0].medium;
        this.mediumDropdownOptions = classList[0].mediums;

        if (classList[0].mediums[0].classes.length === 1) {
          this.idleService.startWatching();
          this.f.class.setValue(classList[0].mediums[0].classes[0].class);
          this.classDropdownOptions = classList[0].mediums[0].classes;

          if (classList[0].mediums[0].classes[0].data.length === 1) {
            this.f.subject.setValue(
              classList[0].mediums[0].classes[0].data[0].subject
            );
            this.subjectDropdownOptions = this.utilityservice.formatSubjectDropdown(classList[0].mediums[0].classes[0].data);
            this.getTopicsSubtopicsOptions();
          } else {
            this.subjectDropdownOptions = this.utilityservice.formatSubjectDropdown(classList[0].mediums[0].classes[0].data);
          }
        } else {
          this.classDropdownOptions = classList[0].mediums[0].classes?.sort(
            (a: any, b: any) => a.class - b.class
          );
        }
      } else {
        this.mediumDropdownOptions = classList[0].mediums;
      }
    }
  }

  onBoardChange(val: any) {
    this.resetBoardChange();
    if (val) {
      this.mediumDropdownOptions = val.mediums;
      if (val.mediums.length === 1) {
        this.f.medium.setValue(val.mediums[0].medium);

        if (val.mediums[0].classes.length === 1) {
          this.idleService.resetIdler();
          this.idleService.startWatching();
          this.f.class.setValue(val.mediums[0].classes[0].class);
          this.classDropdownOptions = val.mediums[0].classes;

          if (val.mediums[0].classes[0].data.length === 1) {
            this.f.subject.setValue(val.mediums[0].classes[0].data[0].subject);
            this.subjectDropdownOptions = this.utilityservice.formatSubjectDropdown(val.mediums[0].classes[0].data);
            this.getTopicsSubtopicsOptions();
          } else {
            this.subjectDropdownOptions = this.utilityservice.formatSubjectDropdown(val.mediums[0].classes[0].data);
          }
        } else {
          this.classDropdownOptions = val.mediums[0].classes?.sort(
            (a: any, b: any) => a.class - b.class
          );
        }
      }
    }
  }

  onMediumChange(val: any) {
    this.resetMediumChange();
    if (val) {
      this.selectedMedium = val?.medium
      this.classDropdownOptions = val.classes?.sort(
        (a: any, b: any) => a.class - b.class
      );
      if (val.classes.length === 1) {
        this.f.class.setValue(val.classes[0].class);
        this.idleService.resetIdler();
        this.idleService.startWatching();
        if (val.classes[0].data.length === 1) {          
          this.idleService.resetIdler();
          this.idleService.startWatching();
          this.f.subject.setValue(val.classes[0].data[0].subject);
          this.subjectDropdownOptions = this.utilityservice.formatSubjectDropdown(val.classes[0].data);
          this.getTopicsSubtopicsOptions();
        } else {
          this.subjectDropdownOptions = this.utilityservice.formatSubjectDropdown(val.classes[0].data);
        }
      }
    }
  }

  onStandardChange(val: any) {
    this.resetClassChange();
    if (val) {
      this.idleService.startWatching();
      this.subjectDropdownOptions = this.utilityservice.formatSubjectDropdown(val.data);
      if (val.data.length === 1) {
        this.f.subject.setValue(val.data[0].subject);
        this.subjectDropdownOptions = this.utilityservice.formatSubjectDropdown(val.data);
        this.getTopicsSubtopicsOptions();
      }
    }
  }

  onSubjectChange(val: any) {
    this.resetSubjectChange();
    if (val) {
      this.getTopicsSubtopicsOptions();
    }
  }

  onTopicSelected(val: any) {
    this.chapterId = val?._id;
    this.resetTopicChange();

    let subTopicSubscriber;

    if (this.getLessonType()?.type === 'plan') {
      subTopicSubscriber = this.contentGenService.getSubtopics(
        val._id,
        'lesson'
      );
    } else {
      subTopicSubscriber = this.contentGenService.getSubtopics(
        val._id,
        'resource'
      );
    }

    subTopicSubscriber.subscribe({
      next: (val: any) => {
        this.setSubtopicDropdownOptions(val.data);
      },
    });
  }

  setSubtopicDropdownOptions(rawOptions: any[]) {
    const formatedOptions = this.getFormatedSubtopics(rawOptions);
    this.subtopicsDropdownOptions = formatedOptions;
  }

  getFormatedSubtopics(rawOptions: any[]) {
    let formatedObj: {
      label: any;
      value: any;
      learningOutcomes: any;
      isAll: any;
      subTopics: any;
    }[] = [];
    rawOptions.forEach((ele) => {
      let obj;
      if (ele.isAll) {
        obj = {
          label: 'All Sub-Topics',
          value: ele._id,
          learningOutcomes: ele?.learningOutcomes ? ele?.learningOutcomes : '',
          isAll: ele.isAll,
          subTopics: ele.subTopics,
        };
        formatedObj.unshift(obj);
      } else {
        obj = {
          label: ele.subTopics.join(' | '),
          value: ele._id,
          learningOutcomes: ele?.learningOutcomes ? ele?.learningOutcomes : '',
          isAll: ele.isAll,
          subTopics: ele.subTopics,
        };
        formatedObj.push(obj);
      }
    });

    return formatedObj;
  }

  onsubTopicSelected(val: any): void {
    this.selectedSubtopic = val;
    this.learningOutcomes = val.learningOutcomes;
    this.initialLearningOutcomes = structuredClone(this.learningOutcomes);
    this.planId = val.value;
    this.combineLearningOutcomes();
    this.isEditable = false;
    this.generateNew = false;
    this.updateButtons()
  }

  combineLearningOutcomes(): void {
    this.combinedLearningOutcomes = this.learningOutcomes
      .map((outcome: any, index: any) => `${index + 1}. ${outcome}`)
      .join('\n');
  }

  splitLearningOutcomes(): void {
    this.learningOutcomes = this.combinedLearningOutcomes
      .split('\n')
      .map((outcome: any) => outcome.replace(/^\d+\.\s*/, ''))
      .filter((outcome: any) => outcome.trim() !== '');
    this.updateButtons();
    this.isEditable = false;
  }

  updateButtons() {
    if (this.compareLearningOutcome()) {
      this.submitBtnTxt = this.getLessonType()?.type === 'plan' ? 'Generate Lesson Plan':'Generate Lesson Resources'
      this.generateNew = false;
    } else {
      this.submitBtnTxt = this.getLessonType()?.type === 'plan' ? 'Regenerate Lesson Plan':'Regenerate Lesson Resources',
      this.generateNew = true;
    }
  }

  resetLearningOutcomes() {
    this.learningOutcomes = this.initialLearningOutcomes;
    this.combineLearningOutcomes();
    this.isEditable = false;
    this.updateButtons();
  }

  compareLearningOutcome() {
    const initalLo = this.initialLearningOutcomes.join();
    const updatedLo = this.learningOutcomes.join();
    const specialCharRegex = /[\s\.\*\&\(\)\[\]\{\}\|\-\+\=\:\;\"\'\,\/\?\<\>\!@#\$%^&\*\(\)\_`\~]+/g;
    const filteredInitalLo = initalLo.replace(specialCharRegex, '');
    const filteredUpdatedLo = updatedLo.replace(specialCharRegex, '');
    return filteredInitalLo === filteredUpdatedLo;
  }

  getTopicsSubtopicsOptions() {
    this.contentGenService
      .getTopicsSubtopics(
        this.lessonForm.get('board')?.value,
        this.lessonForm.get('medium')?.value,
        this.lessonForm.get('class')?.value,
        this.lessonForm.get('subject')?.value
      )
      .subscribe({
        next: (res: any) => {
          this.topicsDropdownOptions =
            this.utilityservice.formatChapterDropdown(res.data['results']);
        },
        error: (err) => {
          console.error(err);
        },
      });
  }

  convertToFormControl(absCtrl: AbstractControl | null): UntypedFormControl {
    return absCtrl as UntypedFormControl;
  }
  get f(): any {
    return this.lessonForm.controls;
  }

  initializeForm() {
    this.lessonForm = this.fb.group({
      medium: [null, [Validators.required]],
      board: [null, [Validators.required]],
      class: [null, [Validators.required]],
      subject: [null, [Validators.required]],
      topics: [null, [Validators.required]],
      subtopics: [null, [Validators.required]],
    });
    if (this.getLessonType()?.type === 'plan') {
      this.addAdditionalControls();
    }
  }

  on_form_submit() {
    this.submitted = true;
    if (this.lessonForm.invalid) {
      return;
    }

    if(this.learningOutcomes?.length === 0){
      return
    }
    
    if (this.generateNew) {
      this.generateNewPlan();
    } else {
      this.generatePlan();
    }
  }

  generateNewPlan() {
    if(this.regenerationLimitReached){
      return
    }
    const data = {
      chapterId: this.chapterId,
      isAll: this.selectedSubtopic.isAll,
      subTopics: this.selectedSubtopic.subTopics,
      learningOutcomes: this.learningOutcomes,
      lessonId: this.selectedSubtopic.value
    };

    this.contentGenService.generateNewContent(data).subscribe({
      next: (res) => {
        this.idleService.planId = this.selectedSubtopic.value;
        this.isGenerate = true;
        this.idleService.stopWatching('lo-regeneration');
        this.router.navigate(['/user/generation-status']);
        this.utilityservice.handleResponse(res);
      },
      error: (err) => {
        this.utilityservice.handleError(err);
      },
    });
  }

  generatePlan() {
    const comprehensionLevel = this.checkboxOptions
      .filter((opt) => opt.checked)
      .map((val) => val.value);

    if (comprehensionLevel.length === 0) {
      this.utilityservice.showError('Please select comprehension level');
      return;
    }
    if (this.getLessonType()?.type === 'plan') {
      let params = new HttpParams();
      params = params.append(
        'filters[includeVideos]',
        this.lessonForm.get('videos')?.value
      );
      params = params.append(
        'filters[levels]',
        JSON.stringify(comprehensionLevel)
      );
      const formvalues = this.lessonForm.value;
      this.contentGenService
        .getLessonPlanDetails(this.planId, params)
        .subscribe({
          next: (val: any) => {
            // impact multiple lesson plan - choose lesson plan
            // this.contentGenService.lessonPlanData = val.data[0];
            this.contentGenService.selectedLessonPlan = val.data[0];
            this.contentGenService.formfiltervalues = formvalues;
            this.isGenerate = true;
            this.router.navigate([this.getLessonType()?.inspectUrl]);
          },
          error: (err) => {
            if (err?.error?.message === 'Video not found!') {
              this.showConfirmPopup = true;
            } else if (err?.error?.message === 'Draft Exists') {
              this.showDraftPopup = true;
              this.draftDetails.id = err?.error?.data?.lessonId;
              this.draftDetails.type = 'lesson';
            } else {
              this.utilityservice.handleError(err);
            }
          },
        });
    } else {
      const formvalues = this.lessonForm.value;
      let params = new HttpParams();
      params = params.append(
        'filters[levels]',
        JSON.stringify(comprehensionLevel)
      );
      this.contentGenService
        .getResourcePlanDetails(this.planId, params)
        .subscribe({
          next: (val: any) => {
            this.contentGenService.resourcePlanData = val.data[0];
            this.contentGenService.formfiltervalues = formvalues;
            this.isGenerate = true;
            this.router.navigate([this.getLessonType()?.inspectUrl]);
          },
          error: (err) => {
            if (err?.error?.message === 'Draft Exists') {
              this.showDraftPopup = true;
              this.draftDetails.id = err?.error?.data?.resourceId;
              this.draftDetails.type = 'resource';
            } else {
              this.utilityservice.handleError(err);
            }
          },
        });
    }
  }

  addAdditionalControls() {
    this.lessonForm.addControl(
      'model',
      this.fb.control('model-1', Validators.required)
    );
    this.lessonForm.addControl(
      'videos',
      this.fb.control(false, Validators.required)
    );
  }

  getLessonType() {
    if (this.lessonType) {
      return this.lessonTypeConfig[this.lessonType];
    } else {
      return null;
    }
  }

  resetBoardChange() {
    this.idleService.resetIdler();
    this.lessonForm.get('medium')?.reset();
    this.mediumDropdownOptions = [];
    this.lessonForm.get('class')?.reset();
    this.classDropdownOptions = [];
    this.lessonForm.get('subject')?.reset();
    this.subjectDropdownOptions = [];
    this.lessonForm.get('topics')?.reset();
    this.topicsDropdownOptions = [];
    this.lessonForm.get('subtopics')?.reset();
    this.subtopicsDropdownOptions = [];
  }

  resetMediumChange() {
    this.idleService.resetIdler();
    this.lessonForm.get('class')?.reset();
    this.classDropdownOptions = [];
    this.lessonForm.get('subject')?.reset();
    this.subjectDropdownOptions = [];
    this.lessonForm.get('topics')?.reset();
    this.topicsDropdownOptions = [];
    this.lessonForm.get('subtopics')?.reset();
    this.subtopicsDropdownOptions = [];
  }

  resetClassChange() {
    this.idleService.resetIdler();
    this.lessonForm.get('subject')?.reset();
    this.subjectDropdownOptions = [];
    this.lessonForm.get('topics')?.reset();
    this.topicsDropdownOptions = [];
    this.lessonForm.get('subtopics')?.reset();
    this.subtopicsDropdownOptions = [];
  }

  resetSubjectChange() {
    this.lessonForm.get('topics')?.reset();
    this.topicsDropdownOptions = [];
    this.lessonForm.get('subtopics')?.reset();
    this.subtopicsDropdownOptions = [];
  }

  resetTopicChange() {
    this.lessonForm.get('subtopics')?.reset();
    this.subtopicsDropdownOptions = [];
  }

  confirm(value: string) {
    if (value === 'ok') {
      this.lessonForm.get('videos')?.setValue(false);
      this.on_form_submit();
    }
    this.showConfirmPopup = false;
  }

  confirmDraft(value: string) {
    if (value === 'ok') {
      if (this.draftDetails.type === 'lesson') {
        this.router.navigate([
          `/user/content-generation/lesson-plan/draft/${this.draftDetails.id}`,
        ]);
      } else {
        this.router.navigate([
          `/user/content-generation/resource-plan/draft/${this.draftDetails.id}`,
        ]);
      }
    }
    this.showDraftPopup = false;
  }

  ngOnDestroy(): void {
    if(!this.isGenerate){
      this.idleService.resetIdler();
    }
  }
}
