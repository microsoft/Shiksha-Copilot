import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  UntypedFormControl,
  Validators,
} from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { UtilityService } from 'src/app/core/services/utility.service';
import { FormDropDownConfig } from 'src/app/shared/interfaces/form-dropdown.interface';
import {
  CORE_OBJECTIVE_MAPPER,
  CORE_OBJECTIVE_MAPPER_10,
  CORE_SUBJECTS,
  LANGUAGE_OBJECTIVE_MAPPER,
} from 'src/app/shared/utility/constant.util';
import { QuestionBankService } from '../question-bank.service';
import { Router } from '@angular/router';
import { IdleService } from 'src/app/shared/services/idle.service';
import { distinctUntilChanged } from 'rxjs';
import { fadeInOutAnimation } from 'src/app/shared/utility/animations.util';

@Component({
  selector: 'app-question-bank-generation',
  templateUrl: './question-bank-generation.component.html',
  styleUrls: ['./question-bank-generation.component.scss'],
  animations: [fadeInOutAnimation],
})
export class QuestionBankGenerationComponent implements OnInit, OnDestroy {
  questionBankConfigForm!: FormGroup;
  submittedConfig: boolean = false;
  submittedTemplate: boolean = false;

  boardDropdownOptions: any[] = [];
  mediumDropdownOptions: any[] = [];
  classDropdownOptions: any[] = [];
  subjectDropdownOptions: any[] = [];
  chapterDropdownOptions: any[] = [];
  subtopicsDropdownOptions: any[] = [];
  bluePrintChapterDropdownOptions: any[] = [];
  bluePrintObjectiveDropdownOptions: any[] = [];

  boardDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Board',
    height: 'auto',
    fieldName: 'Board',
    bindLable: 'board',
    bindValue: 'board',
    required: true,
    clearableOff: true,
  };

  mediumDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Medium',
    height: 'auto',
    fieldName: 'Medium',
    bindLable: 'medium',
    bindValue: 'medium',
    required: true,
    clearableOff: true,
  };

  classDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Class',
    height: 'auto',
    fieldName: 'Class',
    bindLable: 'class',
    bindValue: 'class',
    required: true,
    clearableOff: true,
  };

  subjectDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Subject',
    height: 'auto',
    fieldName: 'Subject',
    bindLable: 'name',
    bindValue: 'name',
    required: true,
    clearableOff: true,
  };

  chapterDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Chapter',
    height: 'auto',
    fieldName: 'Chapter',
    bindLable: 'topics',
    bindValue: 'topics',
    required: true,
    clearableOff: true,
    multi: true,
    selectAllOption: true,
    selectAllValue: 'topics',
    openOnSelect: true,
  };

  subTopicDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Sub-Topic',
    height: 'auto',
    fieldName: 'Sub-Topic',
    bindLable: 'topics',
    bindValue: '_id',
    required: true,
    clearableOff: true,
    multi: true,
    selectAllOption: true,
    openOnSelect: true,
  };

  chapterIds: any[] = [];

  questionBankTypes: any = [
    { value: 'multiChapter', name: 'Multiple Chapters' },
    { value: 'singleChapter', name: 'Single Chapter' },
  ];

  questionBankTypeValue = 'multiChapter';

  questionBankObjectives: any[] = [];

  totalMarks = 0;

  totalPercentage = 100;

  totalDistributedMarks = 0;

  totalDistributedPercentage = 0;

  marksDistribution: any[] = [];

  currentStep: number = 1;

  totalSteps: number = 3;

  stepNames = ['Configuration', 'Template', 'Blue Print'];

  questionBankBluePrintData!: any[];

  objectiveChartMapper: any = {};

  templateData!: any[];

  totalTemplateMarks = 0;

  constructor(
    private fb: FormBuilder,
    private utilityservice: UtilityService,
    private translateService: TranslateService,
    private questionBankService: QuestionBankService,
    private router: Router,
    private idleService: IdleService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    const data: string = localStorage.getItem('userData') ?? '';
    const loggedInUser = JSON.parse(data);
    this.getBoardsList(loggedInUser);
  }

  initializeForm() {
    this.questionBankConfigForm = this.fb.group({
      medium: [null, [Validators.required]],
      board: [null, [Validators.required]],
      grade: [null, [Validators.required]],
      subject: [null, [Validators.required]],
      chapter: [null, [Validators.required]],
      subTopic: [null],
      totalMarks: [null, [Validators.required]],
      examinationName: [null, [Validators.required]],
    });

    this.questionBankConfigForm
      .get('totalMarks')
      ?.valueChanges.pipe(distinctUntilChanged())
      .subscribe({
        next: (val) => {
          this.totalMarks = parseInt(val || 0);
          this.distributeMarks();
        },
      });
  }

  convertToFormControl(absCtrl: AbstractControl | null): UntypedFormControl {
    return absCtrl as UntypedFormControl;
  }

  get f(): any {
    return this.questionBankConfigForm.controls;
  }

  getBoardsList(userDetails: any) {
    let classList = [];
    classList = this.utilityservice.formatResponse(userDetails.classes);
    this.boardDropdownOptions = classList;

    if (classList.length === 1) {
      this.f.board.setValue(classList[0].board);

      const filteredDropdownOptions = this.filterMediumDropdown(classList[0].mediums)

      if (filteredDropdownOptions.length === 1) {
        this.mediumDropdownOptions = filteredDropdownOptions;
          this.f.medium.setValue(filteredDropdownOptions[0].medium);
        
        if (filteredDropdownOptions[0].classes.length === 1) {
          this.f.grade.setValue(filteredDropdownOptions[0].classes[0].class);
          this.classDropdownOptions = filteredDropdownOptions[0].classes;

          const subjectOptions = this.utilityservice.formatSubjecter(filteredDropdownOptions[0].classes[0].data);
          
          if (subjectOptions.length === 1) {
            this.f.subject.setValue(
              subjectOptions[0].name
            );
            this.subjectDropdownOptions = subjectOptions;
            this.onSubjectChange(subjectOptions[0])
          } else {
            this.subjectDropdownOptions = subjectOptions;
          }
        } else {
          this.classDropdownOptions = filteredDropdownOptions[0].classes?.sort(
            (a: any, b: any) => a.class - b.class
          );
        }
      } else {
        this.mediumDropdownOptions = filteredDropdownOptions
      }
    }
  }

  onBoardChange(val: any) {
    this.resetBoardChange();
    if (val) {
      const filteredMedium = this.filterMediumDropdown(val.mediums);
      this.mediumDropdownOptions = filteredMedium
      if (filteredMedium.length === 1) {
          this.f.medium.setValue(filteredMedium[0].medium);
        if (filteredMedium[0].classes.length === 1) {
          this.f.grade.setValue(filteredMedium[0].classes[0].class);
          this.classDropdownOptions = filteredMedium[0].classes;

          const subjectOptions = this.utilityservice.formatSubjecter(filteredMedium[0].classes[0].data);
          if (subjectOptions.length === 1) {
            this.f.subject.setValue(
              subjectOptions[0].name
            );
            this.subjectDropdownOptions = subjectOptions;
            this.onSubjectChange(subjectOptions[0])
          } else {
            this.subjectDropdownOptions = subjectOptions;
          }
        } else {
          this.classDropdownOptions = filteredMedium[0].classes?.sort(
            (a: any, b: any) => a.class - b.class
          );
        }
      }
    }
  }

  onMediumChange(val: any) {
    this.resetMediumChange();
    if (val) {
      this.classDropdownOptions = val.classes?.sort(
        (a: any, b: any) => a.class - b.class
      );
      if (val.classes.length === 1) {
        this.f.grade.setValue(val.classes[0].class);
          const subjectOptions = this.utilityservice.formatSubjecter(val.classes[0].data);
          if (subjectOptions.length === 1) {
            this.f.subject.setValue(
              subjectOptions[0].name
            );
            this.subjectDropdownOptions = subjectOptions;
            this.onSubjectChange(subjectOptions[0])
          } else {
            this.subjectDropdownOptions = subjectOptions;
          }
      }
    }
  }

  onStandardChange(val: any) {
    this.resetClassChange();
    if (val) {
      const subjectOptions = this.utilityservice.formatSubjecter(
        val.data
      );
      if (subjectOptions.length === 1) {
        this.f.subject.setValue(
          subjectOptions[0].name
        );
        this.subjectDropdownOptions = subjectOptions;
        this.onSubjectChange(subjectOptions[0])
      }else{
        this.subjectDropdownOptions = subjectOptions;
      }
    }
  }

  onSubjectChange(val: any) {
    this.resetSubjectChange();
    if (val) {
      let standard = this.f.grade.value;
      if (CORE_SUBJECTS.includes(val.name)) {
        this.questionBankObjectives =
          standard === 10 ? structuredClone(CORE_OBJECTIVE_MAPPER_10) : structuredClone(CORE_OBJECTIVE_MAPPER);
      } else {
        this.questionBankObjectives = structuredClone(LANGUAGE_OBJECTIVE_MAPPER);
      }

      const filter = {
        board: this.f.board.value,
        medium: this.f.medium.value,
        standard,
        subject: val.data,
      };

      this.questionBankService.getChaptersBySem(filter).subscribe({
        next: (val: any) => {
          this.chapterDropdownOptions = val.data;
        },
        error: (err) => {
          console.log(err);
        },
      });
    }
  }

  onChapterChange(val: any) {
    this.distributeMarks();
    if (this.questionBankTypeValue === 'singleChapter') {
      this.f.subTopic.reset();
      this.subtopicsDropdownOptions = val.subTopics;
    }
  }

  onSubtopicChange() {
    this.distributeMarks();
  }

  filterMediumDropdown(dropdownOptions:any){
    const filteredOptions = dropdownOptions.filter((ele:any) => ele.medium != 'kannada')
    return filteredOptions
  }

  distributeMarks() {
    let topics = [];
    if (this.questionBankTypeValue === 'multiChapter') {
      topics = this.f.chapter.value;
    } else {
      topics = this.f.subTopic.value;
    }

    if (this.totalMarks && topics?.length) {
      this.marksDistribution = [];

      const chapterCount = topics.length;
      const marksPerChapter = Math.floor(this.totalMarks / chapterCount);
      const remainingMarks = this.totalMarks % chapterCount;

      const result = topics.map((topic: any, index: any) => {
        const chapterMarks =
          index === 0 ? marksPerChapter + remainingMarks : marksPerChapter;
        const percentage = (chapterMarks / this.totalMarks) * 100;
        return {
          unit_name: topic,
          marks: chapterMarks,
          percentage_distribution: Math.round(percentage),
        };
      });

      this.marksDistribution = result;
    }

    this.totalDistributedMarks = this.totalMarks;
    this.totalDistributedPercentage = 100;
  }

  updatePercentage(i: any) {
    this.marksDistribution[i].marks =
      parseInt(this.marksDistribution[i].marks) || null;
    const marks = this.marksDistribution[i].marks;
    const percentageDistributed = (marks * 100) / this.totalMarks;
    this.marksDistribution[i].percentage_distribution = Math.round(
      percentageDistributed
    );
    this.calculateTotalDistribution();
  }

  calculateTotalDistribution() {
    const result = this.marksDistribution.reduce((acc, current) => {
      return (acc += current.marks);
    }, 0);

    this.totalDistributedMarks = result;
    this.totalDistributedPercentage = Math.round(
      (this.totalDistributedMarks * 100) / this.totalMarks
    );
  }

  calculateTotalPercentage(i: any) {
    this.questionBankObjectives[i].percentage_distribution =  this.questionBankObjectives[i].percentage_distribution === '0' ? 0 :  parseInt(this.questionBankObjectives[i].percentage_distribution) || null;
    this.totalPercentage = this.questionBankObjectives.reduce(
      (accumulator, objective) => {
        return accumulator + objective.percentage_distribution;
      },
      0
    );
  }

  resetBoardChange() {
    this.questionBankConfigForm.get('medium')?.reset();
    this.mediumDropdownOptions = [];
    this.questionBankConfigForm.get('grade')?.reset();
    this.classDropdownOptions = [];
    this.questionBankConfigForm.get('subject')?.reset();
    this.subjectDropdownOptions = [];
    this.resetDistribution();
  }

  resetMediumChange() {
    this.questionBankConfigForm.get('grade')?.reset();
    this.classDropdownOptions = [];
    this.questionBankConfigForm.get('subject')?.reset();
    this.subjectDropdownOptions = [];
    this.resetDistribution();
  }

  resetClassChange() {
    this.questionBankConfigForm.get('subject')?.reset();
    this.subjectDropdownOptions = [];
    this.resetDistribution();
  }

  resetSubjectChange() {
    this.resetDistribution();
  }

  resetDistribution() {
    this.f.chapter.reset();
    this.f.subTopic.reset();
    this.marksDistribution = [];
    this.questionBankObjectives = [];
  }

  onQuestionTypeChange() {
    this.f.chapter.reset();
    this.f.subTopic.reset();
    this.marksDistribution = [];
    if (this.questionBankTypeValue === 'singleChapter') {
      this.chapterDropdownconfig.multi = false;
      this.chapterDropdownconfig.openOnSelect = false;
      this.questionBankConfigForm
        .get('subTopic')
        ?.addValidators(Validators.required);
      this.questionBankConfigForm.get('subTopic')?.updateValueAndValidity();
    } else {
      this.chapterDropdownconfig.multi = true;
      this.chapterDropdownconfig.openOnSelect = true;
      this.questionBankConfigForm.get('subTopic')?.clearValidators();
      this.questionBankConfigForm.get('subTopic')?.updateValueAndValidity();
    }
  }

  backNavigation() {
    this.router.navigate(['/user/question-bank']);
  }

  onSubmit(step: any) {
    switch (step) {
      case 1:
        this.generateTemplate();
        break;
      case 2:
        this.generateBluePrint();
        break;
      case 3:
        this.generateQuestionBank();
        break;

      default:
        break;
    }
  }

  getChapterIds() {
    const chapters = this.f.chapter.value;
    let result;
    if (this.questionBankTypeValue === 'multiChapter') {
      result = chapters
        .map((title: any) => {
          const matchedObject = this.chapterDropdownOptions.find(
            (obj) => obj.topics === title
          );
          return matchedObject ? matchedObject._id : null;
        })
        .filter((_id: any) => _id !== null);
    } else {
      const title = this.f.chapter.value;
      const matchedObject = this.chapterDropdownOptions.find(
        (obj) => obj.topics === title
      );
      return matchedObject ? matchedObject._id : null;
    }

    return result;
  }

  totalTemplateMarksChange(val: any) {
    this.totalTemplateMarks = val;
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  checkEmptyValue(arr: any[], key: any) {
    for (let obj of arr) {
      if (!obj[key]) {
        return true;
      }
    }
    return false;
  }


  checkObjectiveValue(arr: any[], key: any) {
    for (let obj of arr) {
      if (obj[key] === undefined || obj[key] === null || obj[key] === '') {
        return true;
      }
    }
    return false;
  }

  getTemplatePayload() {
    let formData = this.questionBankConfigForm.getRawValue();
    const payload = formData;
    payload.totalMarks = parseInt(payload.totalMarks);
    payload.chapterIds = this.getChapterIds();
    payload.isMultiChapter = this.questionBankTypeValue === 'multiChapter';
    payload.marksDistribution = this.marksDistribution;
    return payload;
  }

  generateTemplate() {
    this.submittedConfig = true;

    if (this.questionBankConfigForm.invalid) {
      return;
    }

    if (this.totalPercentage !== 100) {
      return;
    }

    if (this.totalMarks > 100) {
      return;
    }

    if (this.totalMarks !== this.totalDistributedMarks) {
      return;
    }

    if (this.checkEmptyValue(this.marksDistribution, 'marks')) {
      return;
    }

    if (
      this.checkObjectiveValue(
        this.questionBankObjectives,
        'percentage_distribution'
      )
    ) {
      return;
    }

    if (this.questionBankTypeValue === 'multiChapter' && this.f?.chapter?.value?.length <=1) {
      this.utilityservice.showWarning(
        'Please select at least two chapters when choosing the multiple-chapter option.'
      );
      return;
    }

    const payload = this.getTemplatePayload();
    this.questionBankService.generateQuestionBankTemplate(payload).subscribe({
      next: (res: any) => {
        this.templateData = res.data;
        this.totalTemplateMarks = this.totalMarks;
        if (this.currentStep < this.totalSteps) {
          this.currentStep++;
        }
      },
      error: (err) => {
        this.utilityservice.handleError(err);
      },
    });
  }

  isValidateTemplate() {
    return this.templateData.every((obj) => {
      return ['type', 'number_of_questions', 'marks_per_question'].every(
        (key) => obj[key] !== null && obj[key] !== ''
      );
    });
  }

  hasDuplicateQuestionType(arr: any) {
    if(this.f?.subject?.value === 'Mathematics'){
      return false
    }

    const seenTypes = new Set();
    for (const obj of arr) {
      if (seenTypes.has(obj.type)) {
        return true;
      }
      seenTypes.add(obj.type);
    }
    return false;
  }

  generateBluePrint() {
    this.submittedTemplate = true;

    if (!this.isValidateTemplate()) {
      return;
    }

    if (this.totalTemplateMarks !== this.totalMarks) {
      return;
    }

    if (this.hasDuplicateQuestionType(this.templateData)) {
      this.utilityservice.showWarning(
        'Duplicate question type mapping found. Please verify.'
      );
      return;
    }

    let payload = this.getTemplatePayload();

    payload.objective_distribution = this.questionBankObjectives;

    payload.template = this.templateData;

    this.questionBankService.generateQuestionBankBluePrint(payload).subscribe({
      next: (res) => {
        this.questionBankBluePrintData = res.data;
        const mapper = this.questionBankObjectives;
        mapper.forEach((ele) => {
          this.objectiveChartMapper[ele.objective] = 0;
        });
        this.bluePrintObjectiveDropdownOptions = mapper;

        if (this.questionBankTypeValue === 'multiChapter') {
          this.bluePrintChapterDropdownOptions =
          this.questionBankConfigForm.get('chapter')?.value || [];
        } else {
          this.bluePrintChapterDropdownOptions =
          this.questionBankConfigForm.get('subTopic')?.value || [];
        }
        
        if (this.currentStep < this.totalSteps) {
          this.currentStep++;
        }
      },
      error: (err) => {
        this.utilityservice.handleError(err);
      },
    });
  }

  generateQuestionBank() {
    let payload = this.getTemplatePayload();
    payload.template = this.questionBankBluePrintData;
    payload.objectiveDistribution = this.questionBankObjectives;
    payload.questionBankTemplate = this.templateData;

    this.questionBankService.generateQuestionBank(payload).subscribe({
      next: (res: any) => {
        this.utilityservice.handleResponse(res);
        if(res?.data?._id){
          this.router.navigate([`/user/question-paper/view/${res?.data?._id}`]);
          this.idleService.stopWatching('question-bank-generation');
        }
      },
      error: (err) => {
        this.utilityservice.handleError(err);
      },
    });
  }

  ngOnDestroy(): void {
    this.idleService.resetIdler();
  }
}
