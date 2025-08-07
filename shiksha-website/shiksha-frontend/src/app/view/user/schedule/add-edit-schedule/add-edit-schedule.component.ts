import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  UntypedFormControl,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ScheduleService } from '../schedule.service';
import { UtilityService } from 'src/app/core/services/utility.service';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-add-edit-schedule',
  templateUrl: './add-edit-schedule.component.html',
  styleUrls: ['./add-edit-schedule.component.scss'],
  providers: [DatePipe],
})
export class AddEditScheduleComponent
  implements AfterViewInit, OnInit, OnChanges
{
  @Input() cordinate: any;
  @Input() formData: any;
  @Input() cellData: any;
  @Input() mode!: string;
  @Output() close = new EventEmitter<string>();
  @ViewChild('pop_ele', { static: true }) pop_ele!: ElementRef<any>;
  scheduleForm!: FormGroup;
  editableItem: any;
  classArray: any;
  submitted: boolean = false;
  schoolID!: any;
  teacherId!: string;
  lessonPlanID!: string;
  currentDate= new Date();
  lessonPlanName!: string;

  // dropdown configarations
  boardDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select the Board',
    height: 'auto',
    fieldName: 'Board',
    hideLabel: false,
    bindLable: 'board',
    bindValue: 'board',
    required: true
  };

  mediumDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select the Medium',
    height: 'auto',
    fieldName: 'Medium',
    hideLabel: false,
    bindLable: 'medium',
    bindValue: 'medium',
    required: true
  };

  classNameDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Class',
    height: 'auto',
    fieldName: 'Class Name',
    hideLabel: false,
    bindLable: 'class',
    bindValue: 'class',
    required: true
  };

  subjectDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Subject',
    height: 'auto',
    fieldName: 'Subject',
    hideLabel: false,
    bindLable: 'displayName',
    bindValue: 'subject',
    required: true
  };

  chapterDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select the Chapter',
    height: 'auto',
    fieldName: 'Chapter',
    hideLabel: false,
    bindLable: 'displayValue',
    bindValue: 'topics',
    required: true
  };

  subTopicDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select the SubTopic',
    height: 'auto',
    fieldName: 'Sub Topic',
    hideLabel: false,
    bindLable: 'label',
    bindValue: 'label',
    required: true
  };

  lessonDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select the Lesson Plan',
    height: 'auto',
    fieldName: 'Lesson Plan',
    bindLable: 'name',
    bindValue: 'name',
    required: true
  };

  boardDropdownValue: any[] = [];

  mediumDropdownValue: any[] = [];

  classDropDownValues: any[] = [];

  subjectDropdownValue: any[] = [];

  chapterDropdownValue: any[] = [];

  subTopicDropDownValue: any[] = [];

  lessonPlanDropDownValue: any[] = [];

  //finding the viewport width and height
  vw = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0
  );
  vh = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0
  );

  /**
   * building the formbuilder
   * @param fb
   */
  constructor(
    private fb: FormBuilder,
    private service: ScheduleService,
    private utility: UtilityService
  ) {
    this.scheduleForm = this.fb.group({
      board: [null, Validators.required],
      medium: [null, Validators.required],
      className: [null, Validators.required],
      otherClass: [''],
      subject: [null, Validators.required],
      chapter: [null, Validators.required],
      subTopic: [null, Validators.required],
      lessonPlan: [null, Validators.required],
      schedule: this.fb.array([]),
    });
  }

  /**
   * set the form data based on the event datay
   * @param changes
   */
  ngOnInit(): void {
    const userData = localStorage.getItem('userData'); //user data for teacher id and school id
    if (userData) {
      const parsedUserData = JSON.parse(userData);
      this.schoolID = parsedUserData.school;
    }
    if (this.formData) {
      forkJoin({
        schoolInfo: this.service.getSchoolInfoByID(),
        schedule: this.service.getScheduleById(this.formData.event.id),
      }).subscribe({
        next: (results: any) => {
          this.teacherId = results.schedule.data.teacherId;
          this.editableItem = results.schedule;
          this.lessonPlanID = this.editableItem.data.lesson._id;

          if (this.mode !== 'view') {
            this.classArray = this.utility.formatResponse(
              results.schoolInfo.data.classes
            );
            this.boardDropdownValue = this.classArray;
            this.filterMediumByBoard(this.editableItem.data.board,this.classArray);
            this.filterClassByMedium(
              this.editableItem.data.medium,
              this.mediumDropdownValue
            );
            this.filterSubjectByClass(
              this.editableItem.data.class,
              this.classDropDownValues
            );
            this.loadChapterSubtopicAndLesson();
          } else {
            this.viewFormSetUp();
          }
        },
        error: (err: any) => {
          this.utility.handleError(err);
        },
      });
    }
  }

  /**
   * adjust the modal according  to the cordinate value
   */
  ngAfterViewInit(): void {
    this.setElementCoordinates(this.pop_ele.nativeElement);
  }

    /**
   * align the pop up item near to the clicked event
   */
  setElementCoordinates(nativeElement: any): void {
      if (this.pop_ele) {
        nativeElement.style.left = `${
          this.cordinate.rect.left - nativeElement.offsetWidth - 10
        }px`;
  
        //  checking top is touching or not
        if (this.cordinate.rect.top - nativeElement.offsetHeight - 100 < 0) {
          nativeElement.style.top = `${this.cordinate.rect.bottom}px`;
        }
  
        // checking bottom is touching or not
        if (
          this.cordinate.rect.bottom + nativeElement.offsetHeight + 100 >
          this.vh
        ) {
          nativeElement.style.top = `${
            this.cordinate.rect.top - nativeElement.offsetHeight - 50
          }px`;
        }
  
        // checking left is touching or not
        if (this.cordinate.rect.left - (nativeElement.offsetWidth + 254)  < 0) {
          nativeElement.style.left = `${this.cordinate.rect.right}px`;
        }
  
        // checking right is touching or not
        if (this.cordinate.rect.right + nativeElement.offsetWidth > this.vw) {
          nativeElement.style.left = `${
            this.cordinate.rect.left - nativeElement.offsetWidth
          }px`;
        }
  
        // checking whether both top and bottom are touching or not
        if (
          this.cordinate.rect.top - nativeElement.offsetHeight - 100 < 0 &&
          this.cordinate.rect.bottom + nativeElement.offsetHeight + 100 > this.vh
        ) {
          nativeElement.style.top = '50%';
          nativeElement.style.transform = 'translateY(-50%)';
        }
  
        // checking whether both right and left touching or not
        if (
          this.cordinate.rect.left - nativeElement.offsetWidth < 0 &&
          this.cordinate.rect.right + nativeElement.offsetWidth > this.vw
        ) {
          nativeElement.style.left = `${this.cordinate.rect.right / 2}px`;
        }
      }
    }

  /**
   * for view disable the form and for add add new dateTime form and set the board arrray value
   * @param changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (this.mode === 'view') {
      this.scheduleForm.disable();
    }
    if (this.mode === 'add') {
      this.addNewScheduleInfo(); 
      if(this.cellData){
        this.getScheduleControls().controls[0].patchValue({
          date:this.cellData.date,
          fromTime:this.cellData.time,
          toTime:this.cellData.EndHour
  
        });
      }
     
      
      
      
      this.service.getSchoolInfoByID().subscribe({
        next: (val: any) => {
          this.teacherId = val.data._id;
          this.setBoardDropdownValue(val);
        },
        error: (err: any) => {
          this.utility.handleError(err);
        },
      });
    }
  }


// =============== ADD FLOW ==========

  /**
   * format the response and set the board dropdown array value
   * @param val
   */
  setBoardDropdownValue(val: any) {
    this.classArray = this.utility.formatResponse(val.data.classes);
    if (val) {
      this.boardDropdownValue = this.classArray;
      if (this.boardDropdownValue.length === 1) {
        this.scheduleForm
          .get('board')
          ?.setValue(this.boardDropdownValue[0].board);
        this.setMediumDropdownArray(this.boardDropdownValue[0]);
      }
    }
  }

  /**
   * called when board values changes , reset the all the formfiled except board and set the medium dropdown values
   * @param value
   */
  setMediumDropdownArray(value: any) {
    this.resetBoardChanges();
    if (value) {
      this.mediumDropdownValue = value.mediums;
      if (this.mediumDropdownValue.length === 1) {
        this.scheduleForm
          .get('medium')
          ?.setValue(this.mediumDropdownValue[0].medium);
        this.setClassDropdownValue(this.mediumDropdownValue[0]);
      }
    }
  }


  /**
   * resetting the class and below formfiled and set the classDropdown array value
   * @param value
   */
  setClassDropdownValue(value: any) {
    this.resetMediumChanges();
    if (value) {
      this.classDropDownValues = value.classes?.sort((a:any,b:any)=>a.class-b.class);
      if (this.classDropDownValues.length === 1) {
        this.scheduleForm
          .get('className')
          ?.setValue(this.classDropDownValues[0].class);
        this.setSubjectValue(this.classDropDownValues[0]);
      }
    }
  }


  /**
   * when the class values changes , setting the subject value based on class, resetting chapter and subtopic
   * @param value
   */
  setSubjectValue(value: any) {
    this.resetClassChanges();
    if (value) {
      this.subjectDropdownValue = this.utility.formatSubjectDropdown(value.data);
      if (this.subjectDropdownValue.length === 1) {
        this.scheduleForm
          .get('subject')
          ?.setValue(this.subjectDropdownValue[0].subject);
        this.setChapterValues(this.subjectDropdownValue[0]);
      }
    }
  }

  /**
   * call the api to set the chapter dropdown value
   */
  setChapterValues(value: any) {
    this.resetSubjectChanges();
    if (value) {
      const body = {
        board: this.scheduleForm.get('board')?.value,
        medium: this.scheduleForm.get('medium')?.value,
        standard: this.scheduleForm.get('className')?.value,
        subject: this.scheduleForm.get('subject')?.value,
      };
      this.service.getAllChapter(body).subscribe({
        next: (val: any) => {
          this.chapterDropdownValue = this.utility.formatChapterDropdown(
            val.data.results
          );
        },
        error: (err: any) => {
          this.utility.handleError(err);
        },
      });
    }
  }


  /**
   * if value is present it will define the value for the subTopicDropdown Array and if value not present(clear) reset the subtopic array
   * @param val
   */
  setSubTopicValue(value:any) {
    this.resetChapterChanges();
    if(value){
      const body = {
        board: this.scheduleForm.get('board')?.value,
        medium: this.scheduleForm.get('medium')?.value,
        standard: this.scheduleForm.get('className')?.value,
        subject: this.scheduleForm.get('subject')?.value,
        topic: this.scheduleForm.get('chapter')?.value,
      };
      this.service.getAllSubTopic(body).subscribe({
        next: (val: any) => {
          this.setSubTopicData(val.data);
        },
      });
    }
  }


  setSubTopicData(val: any) {
    const formatttedData = this.formatSubTopics(val);
    this.subTopicDropDownValue = formatttedData;
  }

  formatSubTopics(val:any){
    let formateObj: {
      label: any;
      lessonList: any;
    }[] = [];
    val[0].subtopics.forEach((ele: any) => {
      let obj;
      if(ele.isAll){
        obj={
          label: 'All Sub-Topics',
          lessonList:ele.lessons
        }
      }else{
        obj={
          label: ele.subtopic.join(' | '),
          lessonList:ele.lessons
        }
      }
      formateObj.push(obj);
    });
    return formateObj;
  }


  /**
   * call the lesson api using className,chapter,subtopic and set the response array to the lesson plan array
   */
  setLessonPlan(val: any) {
    this.lessonPlanDropDownValue = [];
    this.scheduleForm.get('lessonPlan')?.reset();
    this.lessonPlanDropDownValue = val.lessonList;
    if(this.lessonPlanDropDownValue.length === 1){
      this.scheduleForm.get('lessonPlan')?.setValue(this.lessonPlanDropDownValue[0].name);
      this.lessonPlanID = this.lessonPlanDropDownValue[0].lessonId;
    }
  }

  /**
   * on lesson changes get the lesson plan ID to send in the body of the api
   * @param lessonValue
   */
  getLessonId(lessonValue: any) {
    this.lessonPlanID = lessonValue.lessonId;
  }

// ======== ADD FLOW END HERE ===========



// ======== EDIT FLOW START HERE =========

  /**
   * called when edit called, filter the medium based on the board value from boardDropdownArray
   * @param val
   */
  filterMediumByBoard(val: any,dropdownValueArray:any) {
    if (val) {
      const mediumData = dropdownValueArray.filter((item: any) => {
        return item.board === val;
      });
      this.mediumDropdownValue = mediumData[0].mediums;
    }
  }

  /**
   * called when edit called, it will filter the class based on the medium value from mediumDropdown
   * @param value
   * @param dropdownValueArray
   */
  filterClassByMedium(value: string, dropdownValueArray: any) {
    const classValues = dropdownValueArray.filter((item: any) => {
      return value === item.medium;
    });
    this.classDropDownValues = classValues[0].classes?.sort((a:any,b:any)=>a.class-b.class);
  }

  /**
   * called when edit called, it will filter the subject based on the class value from classDropdown Array
   * @param value
   * @param dropdownValueArray
   */  
  filterSubjectByClass(value: string, dropdownValueArray: any) {
    const subjectValues = dropdownValueArray.filter((item: any) => {
      return value === item.class;
    });
    this.subjectDropdownValue = this.utility.formatSubjectDropdown(subjectValues[0].data);
  }


  /**
   * Not Used
   * @param value 
   */
  filterSubTopicByTopic(value: any) {
    this.subTopicDropDownValue = value.subTopics;
    this.scheduleForm
      .get('lessonPlan')
      ?.setValue(this.editableItem.data.lesson.name);
  }


  /**
   * call both chapter and subtopic api to get the array and set the lesson plan and call form setUp
   */
  loadChapterSubtopicAndLesson(){
    let chapterBody = {
        board: this.editableItem.data.board,
        medium: this.editableItem.data.medium,
        standard: this.editableItem.data.class,
        subject: this.editableItem.data.subject,
    }
    let subTopicBody = {
      ...chapterBody,
      topic:this.editableItem.data.topic
    }
    forkJoin({
      chapter: this.service.getAllChapter(chapterBody),
      subTopic: this.service.getAllSubTopic(subTopicBody),
    }).subscribe({
      next:(result:any)=>{
        this.chapterDropdownValue = this.utility.formatChapterDropdown(
          result.chapter.data.results
        );
        this.setSubTopicData(result.subTopic.data);
        this.setLessonPlan(this.subTopicDropDownValue[0]);
        this.setFormValues();
      }
    })
  }

   /**
    * Not Used
   * for edit purpose setting the formInfo
   */
   editFormSetup() {
    this.setFormValues();
    
  }

  setFormValues() {
    this.scheduleForm.patchValue({
      board: this.editableItem.data.board,
      medium: this.editableItem.data.medium,
      className: this.editableItem.data.class,
      otherClass: this.editableItem.data.otherClass,
      subject: this.editableItem.data.subject,
      chapter: this.editableItem.data.topic,
      subTopic: this.editableItem.data.subTopic,
      lessonPlan: this.editableItem.data.lesson.name,
      schedule: this.setDateTimeValue(),
    });
  }

// =========== EDIT FLOW END HERE =============



// =============== VIEW FLOW HERE =============
  viewFormSetUp() {
    this.chapterDropdownValue = [];
    this.chapterDropdownValue.push({
      displayValue: `${this.editableItem?.data?.lesson?.chapter?.orderNumber}. ${this.editableItem.data.topic}`,
      topics: this.editableItem.data.topic,
    });
    this.subjectDropdownValue = [];
    const subjects = [
      {
        ...this.editableItem?.data?.lesson?.subjects,
        subject:this.editableItem?.data?.subject
      }
    ]
    if(subjects.length){
      this.subjectDropdownValue = this.utility.formatSubjectDropdown(subjects)
    }
    this.setFormValues();
  }
// =========== VIEW FLOW END HERE ==============



// ========= DELETE FLOW START HERE =============

  /**
   * remove the specific formgroup of the formarray
   * @param index
   */
  deleteScheduleInfo(index: number) {
    this.getScheduleControls().removeAt(index);
  }
// ============ DELETE FLOW END HERE ================
  

  
  

  /**
   * Not Used
   * this function will set the chapter dropdown value and patch the iniitial value for edit
   * @param value
   * @param body
   */
  chapterPatchValue(value: string) {
    const body = {
      board: this.editableItem.data.board,
      medium: this.editableItem.data.medium,
      standard: this.editableItem.data.class,
      subject: this.editableItem.data.subject,
    };
    this.service.getAllChapter(body).subscribe({
      next: (val: any) => {
        this.chapterDropdownValue = this.utility.formatChapterDropdown(
          val.data.results
        );
        this.editSetSubTopicValue();
      },
      error: (err: any) => {
        this.utility.handleError(err);
      },
    });
  }


  

  



  /**
   * Not Used
   */
  editSetSubTopicValue(){
    this.resetChapterChanges();

    const body = {
      board: this.scheduleForm.get('board')?.value,
      medium: this.scheduleForm.get('medium')?.value,
      standard: this.scheduleForm.get('className')?.value,
      subject: this.scheduleForm.get('subject')?.value,
      topic: this.scheduleForm.get('chapter')?.value,
    };
    this.service.getAllSubTopic(body).subscribe({
      next: (val: any) => {
        this.setSubTopicData(val.data);
        this.scheduleForm.get('subTopic')?.setValue(this.editableItem.data.subTopic);
        this.setLessonPlan(this.subTopicDropDownValue[0]);
        this.scheduleForm
      .get('lessonPlan')
      ?.setValue(this.editableItem.data.lesson.name);
      },
    });
  }

  

  // ========= UTILITY METHODS =========
 

  /**
   * add the retrieved value event to the formarray other word setting the scheduleItems
   */
  setDateTimeValue() {
    for (let scheduleItem of this.editableItem.data.scheduleDateTime) {
      this.getScheduleControls().push(this.newScheduleInfo(scheduleItem));
    }
  }

  get f(): any {
    return this.scheduleForm.controls;
  }

  /**
   * Function to convert control to form control
   * @param absCtrl
   * @returns
   */
  convertToFormControl(absCtrl: AbstractControl | null): UntypedFormControl {
    return absCtrl as UntypedFormControl;
  }

  /**
   * return the new form group with field date,startDate and endDate
   * @param data
   * @returns
   */
  newScheduleInfo(data: any = null) {
    return this.fb.group(
      {
        date: [
          this.utility.formateDate(data).date ?? null,
          [Validators.required, this.dateValidator],
        ],
        fromTime: [
          data?.fromTime ?? null,
          [Validators.required, this.startEndTimeValidator],
        ],
        toTime: [
          data?.toTime ?? null,
          [Validators.required, this.startEndTimeValidator],
        ],
      },
      {
        validator: [this.timeRangeValidator,this.pastTimeValidatory],
      }
    );
  }

  

  /**
   * return the formarray of the schedule
   * @returns
   */
  getScheduleControls() {
    return this.scheduleForm.get('schedule') as FormArray;
  }

  /**
   * adding new form group to the formarray
   */
  addNewScheduleInfo() {
    this.getScheduleControls().push(this.newScheduleInfo(null));
  }

 

  /**
   * send the details to the backend
   */
  onSave() {
    let body;
    this.submitted = true;

    if (!this.scheduleForm.valid) {
      return;
    }
    const commonBodyValue = {
      teacherId: this.teacherId,
      board: this.scheduleForm.get('board')?.value,
      medium: this.scheduleForm.get('medium')?.value,
      subject: this.scheduleForm.get('subject')?.value,
      topic: this.scheduleForm.get('chapter')?.value,
      subTopic: this.scheduleForm.get('subTopic')?.value,
      scheduleType: 'regular',
      class: +this.scheduleForm.get('className')?.value,
      otherClass: this.scheduleForm.get('otherClass')?.value,
      scheduleDateTime: this.getScheduleControls().value,
      schoolId: this.schoolID._id,
      lessonId: this.lessonPlanID,
    };
    if (this.mode === 'add') {
      this.service.createSchedule(commonBodyValue).subscribe({
        next: (response: any) => {
          this.close.emit('save');
          this.utility.showSuccess('Schedule Created Successfully');
        },
        error: (err: any) => {
          this.utility.handleError(err);
        },
      });
    } else if (this.mode === 'edit') {
      body = {
        _id: this.editableItem.data._id,
        ...commonBodyValue,
      };
      this.service.updateSchedule(body).subscribe({
        next: (response: any) => {
          this.close.emit('save');
          this.utility.showSuccess('Schedule Update Successfully');
        },
        error: (err: any) => {
          this.utility.handleError(err);
        },
      });
    }
  }

  /**
   * close the pop upon clicking save,cancel and cross mark
   */
  closePopUP() {
    this.close.emit();
  }

  
  // error handling message functions for start , end and date
  /**
   *  getting errror message for the date formControl
   * @param controls
   * @returns
   */
  getDateError(controls: any) {
    if (this.submitted && controls.get('date')?.errors?.['required']) {
      return 'Date is required';
    } else {
      return this.submitted && controls.get('date')?.errors?.['inValidDate']
        ? 'Please select the current date'
        : '';
    }
  }

  /**
   * getting the error message for the fromTime Control
   * @param control
   * @returns
   */
  getStartTimeError(control: any) {
    if (this.submitted && control.get('fromTime')?.errors?.['required']) {
      return 'Start Time Required';
    }else if (this.submitted && control.errors?.['InvalidTime']){
      return 'Please choose a future time'
    }
    else {
      return this.submitted &&
        control.get('fromTime')?.touched &&
        control.get('fromTime')?.errors?.['InvalidStartDate']
        ? 'Start Time must be between 7AM to 6PM'
        : '';
    }
  }

  /**
   * getting the error message for the EndTime Control
   * @param controls
   * @returns
   */
  getEndTimeError(controls: any) {
    if (this.submitted && controls.get('toTime')?.errors?.['required']) {
      return 'End Time Required';
    } else if (
      this.submitted &&
      controls.get('toTime')?.errors?.['InvalidStartDate']
    ) {
      return 'End Time must be between 7AM to 6PM';
    } else {
      return this.submitted && controls.errors?.['lessThanStart']
        ? 'End Time must be greater than start'
        : '';
    }
  }

  // Validator for start,end and date
  startEndTimeValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string; 
    if (!value) {
      return null; 
    }
    const [hour, minute] = value.split(':').map(part => parseInt(part, 10)); // Parsing hour and minute
    // Invalid if hour is before 7, after 18, or at 18:01 or later
    if (hour < 7 || hour > 18 || (hour === 18 && minute > 0)) {
      return { InvalidStartDate: true }; 
    }
    return null; // Valid time
  }


  pastTimeValidatory(control:AbstractControl):ValidationErrors | null{
    const value = control.get('fromTime')?.value as string;
    const parentControl = control?.get('date')?.value;
    const selectedDate = new Date(parentControl);
    const  now = new Date();
    const todayHour = now.getHours();
    const todayMin = now.getMinutes();
    now.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
      if(!value)
      {
        return null;
      }
  
      
      const [hour, minute] = value.split(':').map(part => parseInt(part, 10)); // Parsing hour and minute
      if(selectedDate.toString() === now.toString() && (todayHour > hour || (todayHour === hour && todayMin > minute))) {
        return {InvalidTime: true};
      }
      return null;
    
  }


  dateValidator(control: AbstractControl): ValidationErrors | null {
    const now = new Date();
    const selectedDate = new Date(control.value);
    now.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    if (control.value && now > selectedDate) {
      return { inValidDate: true };
    }
    return null;
  }

  timeRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startTime = control.get('fromTime')?.value;
    const endTime = control.get('toTime')?.value;

    if (!startTime || !endTime) {
      return null;
    }
    if (startTime > endTime) {
      return { lessThanStart: true };
    }
    return null;
  }

  resetFormControls(...controls: string[]) {
    controls.forEach((controlName) => {
      const control = this.scheduleForm.get(controlName);
      if (control) {
        control.reset();
      }
      switch (controlName) {
        case 'medium':
          this.mediumDropdownValue = [];
          break;
        case 'className':
          this.classDropDownValues = [];
          break;
        case 'subject':
          this.subjectDropdownValue = [];
          break;
        case 'chapter':
          this.chapterDropdownValue = [];
          break;
        case 'subTopic':
          this.subTopicDropDownValue = [];
          break;
        case 'lessonPlan':
          this.lessonPlanDropDownValue = [];
          break;
        default:
          break;
      }
    });
  }

  resetBoardChanges() {
    this.resetFormControls(
      'medium',
      'className',
      'subject',
      'chapter',
      'subTopic',
      'lessonPlan'
    );
  }

  resetMediumChanges() {
    this.resetFormControls(
      'className',
      'subject',
      'chapter',
      'subTopic',
      'lessonPlan'
    );
  }

  resetClassChanges() {
    this.resetFormControls('subject', 'chapter', 'subTopic', 'lessonPlan');
  }

  resetSubjectChanges() {
    this.resetFormControls('chapter', 'subTopic', 'lessonPlan');
  }

  resetChapterChanges() {
    this.resetFormControls('subTopic', 'lessonPlan');
  }
}
