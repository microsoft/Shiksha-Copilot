import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  UntypedFormArray,
  UntypedFormControl,
  Validators,
} from '@angular/forms';
import { languege } from 'src/app/shared/utility/languege.util';
import { ProfileService } from './profile.service';
import { FormDropDownConfig } from 'src/app/shared/interfaces/form-dropdown.interface';
import { UtilityService } from 'src/app/core/services/utility.service';
import { MasterService } from 'src/app/shared/services/master.service';
import { Router } from '@angular/router';
import { SidebarService } from 'src/app/layout/sidebar/sidebar.service';
import { forkJoin } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  showDeleteClassDetailsConfirm!: boolean;
  showDeleteResourceConfirm!: boolean;
  selectedClassIndex!:any;
  selectedResIndex!:any;
  languageConfig = languege;

  langDropDownConfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select Preferred Language',
    height: 'auto',
    fieldName: 'languege',
  };

  submitted: boolean = false;

  boardDropdownOptions: any[] = [];
  boardTypeDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select board',
    height: 'auto',
    fieldName: 'Board',
    hideLabel: true,
    bindLable: '_id',
    bindValue: '_id',
  };

  mediumDropdownOptions: any[] = [];
  mediumTypeDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select medium',
    height: 'auto',
    fieldName: 'Medium',
    hideLabel: true,
    bindLable: 'medium',
    bindValue: 'medium',
  };

  classDropdownOptions: any[] = [];
  classTypeDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select class',
    height: 'auto',
    fieldName: 'Standard',
    hideLabel: true,
    bindLable: 'standard',
    bindValue: 'standard',
  };

  subjectDropdownOptions: any[] = [];
  subjectTypeDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select subject',
    height: 'auto',
    fieldName: 'Subject',
    hideLabel: true,
    bindLable: '_id',
    bindValue: '_id',
  };

  resourceTypeDropdownOptions: any[] = [];
  resourceTypeDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select Resource',
    height: 'auto',
    fieldName: 'Resource Type',
    hideLabel: false,
    bindLable: 'type',
    bindValue: 'type',
  };

  resourceTypeDarkDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Type',
    height: 'auto',
    fieldName: 'Resource Type',
    hideLabel: false,
    bindLable: 'type',
    bindValue: 'type',
  };

  resourceOtherValue: any[] = [''];

  resourceDetailsDropdownOptions: any[] = [];
  resourceDetailsDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select details',
    height: 'auto',
    fieldName: 'Resource Details',
    multi: true,
    clearableOff: true,
    hideLabel: true,
    hideChips: true,
  };

  userData: any;
  userPorfileForm!: FormGroup;
  loggedInUser: any;
  dependentPatchData: any;
  resourceMasterData: any;
  boardMasterData: any;

  schoolTableHeader = [
    'Board',
    'Medium',
    'Class / Grade',
    'Subject',
    'No. of Boys',
    'No. of Girls',
    'Action',
  ];

  patchObj: any;

  defaultBoard = null;

  defaultMedium = null;

  showDeleteProfileImageConfirm =false;

  currentSubjects:any[]=[];

  constructor(
    private fb: FormBuilder,
    private service: ProfileService,
    private utilityService: UtilityService,
    private masterService: MasterService,
    private router: Router,
    public sidebarService: SidebarService,
    private translateService: TranslateService
  ) {}

  /**
   * Angular oninit lifecycle hook used here for form initialization
   */
  ngOnInit(): void {
    const data: string = localStorage.getItem('userData') ?? '';
    this.loggedInUser = JSON.parse(data);
    this.createUserForm();
    this.getData();
  }

  /**
   * Function to get all master data and profile data
   */
  getData() {
    const boardMaster = this.service.getClassesByBoard(
      this.loggedInUser.school._id
    );
    const resourceMaster = this.masterService.getFacilities();
    const userProfile = this.service.getProfileInfo(this.loggedInUser._id);

    forkJoin([boardMaster, resourceMaster, userProfile]).subscribe({
      next: ([boardRes, resourceRes, profileRes]) => {
        this.setClassesByBoard(boardRes);
        this.setResourceData(resourceRes);
        this.setProfileInfo(profileRes);
      },
      error:(err)=>{
        this.utilityService.handleError(err)
      }
    });
  }

  setClassesByBoard(val:any) {
    this.boardMasterData = val.data;
    this.boardDropdownOptions = val.data;
    this.presetValues(this.boardMasterData);
  }

  /**
   * Function to get set present value if one board or medium
   * @param data
   */
  presetValues(data: any) {
    if (data.length === 1) {
      this.defaultBoard = data[0]._id;
      if (data[0].medium.length === 1) {
        this.defaultMedium = data[0].medium[0].medium;
      }
    }
  }

  /**
   * Function to set section and subject
   * @param i
   * @param val
   */
  setMediumSubjectDropdown(i: any, val: any, mode: any) {
    this.resetclassInfo('board', i);
    if (val) {
      this.mediumDropdownOptions[i] = val.medium;
      this.currentSubjects[i] = val.subjects;
      // this.subjectDropdownOptions[i] = val.subjects;
      if (val.medium.length === 1 && mode === 'add') {
        this.classes.controls[i].get('medium')?.setValue(val.medium[0].medium);
        this.classDropdownOptions[i] = val.medium[0].classDetails;
      }
    }
  }

  setClassDropdown(i: any, val: any) {
    this.resetclassInfo('medium', i);
    if (val) {
      this.classDropdownOptions[i] = val.classDetails;
    }
  }

  /**
   * Function to set strength
   * @param i
   * @param val
   */
  setStrength(i: any, val: any) {
    this.resetclassInfo('standard', i);

    if (val) {
      this.subjectDropdownOptions[i] = this.filterSubjects(val.standard,this.currentSubjects[i])
      this.resetclassInfo('strength', i);
      this.classes.controls[i].get('boysStrength')?.setValue(val.boysStrength);
      this.classes.controls[i]
        .get('girlsStrength')
        ?.setValue(val.girlsStrength);
    } else {
      this.resetclassInfo('strength', i);
    }
  }

  /**
   * Function to reset class info
   * @param type
   * @param i
   */
  resetclassInfo(type: any, i: any) {
    if (type === 'board') {
      this.classes.controls[i].get('medium')?.reset();
      this.classes.controls[i].get('class')?.reset();
      this.classes.controls[i].get('subject')?.reset();
      this.classes.controls[i].get('subjectDetails')?.reset();
      this.classDropdownOptions[i] = [];
      this.mediumDropdownOptions[i] = [];
      this.subjectDropdownOptions[i] = [];
    } else if (type === 'medium') {
      this.classes.controls[i].get('class')?.reset();
      this.classes.controls[i].get('subject')?.reset();
      this.classes.controls[i].get('subjectDetails')?.reset();
      this.classDropdownOptions[i] = [];
      this.subjectDropdownOptions[i] = [];
    }
    else if (type === 'standard') {
      this.subjectDropdownOptions[i] = [];
      this.classes.controls[i].get('subject')?.reset();
      this.classes.controls[i].get('subjectDetails')?.reset();
    }
    this.classes.controls[i].get('boysStrength')?.reset();
    this.classes.controls[i].get('girlsStrength')?.reset();
  }

  /**
   * Function to get profile info
   */
  setProfileInfo(val:any) {
      const schoolFacilities = val?.data?.school?.facilities;
      this.mergeSchoolResource(schoolFacilities);

        this.userData = val?.data;
        const keysToRemove = ['classes', 'facilities'];

        const { newObj, removedObj } = this.utilityService.removeKeys(
          val?.data,
          keysToRemove
        );
        this.patchObj = newObj;
        this.dependentPatchData = removedObj;

        if (
          this.dependentPatchData.classes &&
          this.dependentPatchData.classes.length > 0
        ) {
          for (let data of this.dependentPatchData.classes) {
            if (data) {
              this.addNewclasses('edit');
            }
          }
          this.patchClasses();
        } else {
          this.addNewclasses('add');
        }

        if (
          this.dependentPatchData.facilities &&
          this.dependentPatchData.facilities.length > 0
        ) {
          this.resourceTypeDropdownOptions = this.resourceMasterData;
          for (
            let i = 0;
            i < this.dependentPatchData.facilities.length - 1;
            i++
          ) {
            this.addResource();
          }
          this.patchResourceDropdown();
        }
  }

  /**
   * Function to create user profile form
   */
  createUserForm() {
    this.userPorfileForm = this.fb.group({
      classes: this.fb.array([]),
      facilities: this.fb.array([]),
      preferredLanguage: [this.loggedInUser?.preferredLanguage],
    });
    this.addResource();
  }

  /**
   * Function to get resource data
   */
  setResourceData(val: any) {
    this.resourceTypeDropdownOptions = val?.data?.results;
    this.resourceMasterData = val?.data?.results;
  }

  mergeSchoolResource(schoolResource:any){
    const schoolOthers = schoolResource.filter((ele:any)=> ele.type =='Others').map((item:any)=> 
      {
        return {
          type: item.otherType,
          facilities: item.details,
          otherType: null,
          typeChipSet: item.typeChipSet,
          detailsChipSet: item.detailsChipSet
          }
      }
  )
  this.resourceTypeDropdownOptions.push(...schoolOthers)
  
    const otherObj = {
      type: 'Others',
    };
    this.resourceTypeDropdownOptions.push(otherObj);
  }

  /**
   * Function to set resouce details options
   * @param i
   * @param val
   */
  setResourceDetailsValues(i: any, val: any) {
    const facilityControl = this.facilities.controls[i];
    this.utilityService.setResourceDetailsValue(
      facilityControl,
      this.resourceDetailsDropdownOptions,
      i,
      val
    );
  }

  subjectMapper(i:any, val:any){
    if (val) {
      let mapSubjects = val.subjects.sort((a:any,b:any)=> a.sem - b.sem)
      this.classes.controls[i].get('subjectDetails')?.setValue(mapSubjects);
    } 
  }

  filterSubjects(standard:any,subjects:any[]){
    if(standard === 5){
      return subjects.filter((e)=> e._id !== 'Science');
    }
    return subjects.filter((e)=> e._id !== 'Evs');
  }


  setSubjectDropdown(i:any,val:any,standard:any){
    if (val) {
      this.subjectDropdownOptions[i] = this.filterSubjects(standard,val.subjects);
    }
  }
  /**
   * Function to patch class data
   */
  patchClasses() {
    for (let i = 0; i < this.dependentPatchData.classes.length; i++) {
      this.classes.controls[i]
        ?.get('board')
        ?.setValue(this.dependentPatchData.classes[i].board);
      const mediums = this.boardMasterData.filter(
        (e: any) => e._id === this.dependentPatchData.classes[i].board
      );
      this.setMediumSubjectDropdown(i, mediums[0], 'edit');
      this.classes.controls[i]
        ?.get('medium')
        ?.setValue(this.dependentPatchData.classes[i].medium);
      const classes = mediums[0].medium.filter(
        (e: any) => e.medium === this.dependentPatchData.classes[i].medium
      );
      this.setClassDropdown(i, classes[0]);
      this.setSubjectDropdown(i,mediums[0],this.dependentPatchData.classes[i].class)
      this.classes.controls[i]
        ?.get('class')
        ?.setValue(this.dependentPatchData.classes[i].class);
      this.classes.controls[i]
        ?.get('subject')
        ?.setValue(this.dependentPatchData.classes[i].subject);
      this.classes.controls[i]
        ?.get('boysStrength')
        ?.setValue(this.dependentPatchData.classes[i].boysStrength);
      this.classes.controls[i]
        ?.get('girlsStrength')
        ?.setValue(this.dependentPatchData.classes[i].girlsStrength);
        this.classes.controls[i]
        ?.get('subjectDetails')
        ?.setValue(this.dependentPatchData.classes[i].subjectDetails);
    }
  }

  /**
   * Function to patch resource data
   */
  patchResourceDropdown() {
    if (this.dependentPatchData.facilities.length) {
      for (let i = 0; i < this.facilities.length; i++) {
        this.facilities.controls[i]
          .get('type')
          ?.setValue(this.dependentPatchData.facilities[i]?.type);
        this.facilities.controls[i]
          .get('typeChipSet')
          ?.setValue(this.dependentPatchData.facilities[i]?.typeChipSet);
        this.facilities.controls[i]
          .get('detailsChipSet')
          ?.setValue(this.dependentPatchData.facilities[i]?.typeChipSet);

        if (this.dependentPatchData.facilities[i]?.typeChipSet) {
          const valueForDetails = this.utilityService.filterDropdownValues(
            this.resourceMasterData,
            'type',
            this.dependentPatchData.facilities[i].type
          );
          this.resourceDetailsDropdownOptions[i] = [
            ...valueForDetails.facilities,
          ];
        }
        this.facilities.controls[i]
          .get('otherType')
          ?.setValue(this.dependentPatchData.facilities[i].otherType);
        this.facilities.controls[i]
          .get('details')
          ?.setValue(this.updatedDetailsMapper(this.dependentPatchData.facilities[i].otherType,this.dependentPatchData.facilities[i].details,i));
        if (this.dependentPatchData.facilities[i].otherType) {
          this.facilities.controls[i]
            .get('otherType')
            ?.addValidators(Validators.required);
          this.facilities.controls[i]
            .get('otherType')
            ?.updateValueAndValidity();
        }
        this.facilities.controls[i]
          .get('details')
          ?.setValidators(Validators.required);
        this.facilities.controls[i].get('details')?.updateValueAndValidity();
      }
    }
  }

  updatedDetailsMapper(type:any,userFacilityDetailsValue:any[],i:any){
    if(type === null){
      return userFacilityDetailsValue.filter((item)=>this.resourceDetailsDropdownOptions[i].includes(item))
    }else{
      return userFacilityDetailsValue
    }
  }

  /**
   * Function called on language change
   * @param lang
   */
  languageChanged(lang: any) {
    this.service.updatePreferedLanguage(lang).
    subscribe({
      next:(res)=>{
        this.loggedInUser.preferredLanguage = lang;
        this.userPorfileForm.get('preferredLanguage')?.setValue(lang);
        this.utilityService.handleResponse(res);
        localStorage.setItem('userData', JSON.stringify(this.loggedInUser));
        this.translateService.use(lang);
      },
      error:(err)=>{
        this.utilityService.handleError(err)
      }
    })
    
  }

  /**
   * getter for formcontrol
   */
  get f(): any {
    return this.userPorfileForm.controls;
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
   * gives the formArray of the respected group Name
   * @param groupName
   * @returns
   */
  getFormArray(groupName: string): FormArray {
    return this.userPorfileForm.get(groupName) as FormArray;
  }

  /**
   * getter for classes
   */
  get classes() {
    return this.userPorfileForm.get('classes') as UntypedFormArray;
  }

  /**
   * getter for facilities
   */
  get facilities() {
    return this.userPorfileForm.get('facilities') as UntypedFormArray;
  }

  /**
   * Function to add new classes controls
   */
  addNewclasses(mode: any) {
    this.mediumDropdownOptions.push([]);
    this.classDropdownOptions.push([]);
    this.subjectDropdownOptions.push([]);
    this.classes.push(
      this.fb.group({
        board: [null, [Validators.required]],
        medium: [null, [Validators.required]],
        class: [null, [Validators.required]],
        subject: [null, [Validators.required]],
        boysStrength: null,
        girlsStrength: null,
        subjectDetails:[null, [Validators.required]]
      })
    );
    if (mode === 'add') {
      this.defaultPreset();
    }
  }

  /**
   * Function to set default preset value for one board or medium
   */
  defaultPreset() {
    if (this.defaultBoard) {
      this.boardDropdownOptions = this.boardMasterData;
      this.mediumDropdownOptions[this.classes.length - 1] =
        this.boardMasterData[0].medium;
      // this.subjectDropdownOptions[this.classes.length - 1] =
      //   this.boardMasterData[0].subjects;
      this.currentSubjects[this.classes.length - 1] = this.boardMasterData[0].subjects;
      this.classes.controls[this.classes.length - 1]
        .get('board')
        ?.setValue(this.defaultBoard);
      if (this.defaultMedium) {
        this.classDropdownOptions[this.classes.length - 1] =
          this.boardMasterData[0].medium[0].classDetails;
        this.classes.controls[this.classes.length - 1]
          .get('medium')
          ?.setValue(this.defaultMedium);
      }
    }
  }

  /**
   * Function to delete class
   */
  deleteclass(i: any) {
    this.classes.removeAt(i);
  }

  /**
   * Function to add resource control
   */
  addResource() {
    this.resourceDetailsDropdownOptions.push([]);

    this.facilities.push(
      this.fb.group({
        type: [null],
        details: [[]],
        otherType: [],
        typeChipSet: [true],
        detailsChipSet: [true],
      })
    );
    this.resourceOtherValue.push('');
  }

  /**
   * Function to remove resource control
   * @param index
   */
  removeResource(index: any) {
    this.facilities.removeAt(index);
    this.resourceOtherValue = this.resourceOtherValue.splice(index, 1);
  }

  /**
   * Function to add other resource
   * @param control
   * @param i
   * @param event
   */
  addOtherResource(control: AbstractControl, i: any, event: Event) {
    if (this.resourceOtherValue[i]) {
      let updatedArr: string[] = structuredClone(control.get('details')?.value);
      updatedArr.push(this.resourceOtherValue[i]);
      control.get('details')?.setValue(updatedArr);
      this.resourceOtherValue[i] = '';
    }
  }

  /**
   * Function to remove chip item
   * @param control
   * @param i
   */
  removeItem(control: AbstractControl, i: any) {
    let updatedArr: string[] = structuredClone(control.get('details')?.value);
    updatedArr = updatedArr.filter(
      (item) => item !== control.get('details')?.value[i]
    );
    control.get('details')?.setValue(updatedArr);
  }

  /**
   * get the image data from the file input and append the profile photo to the imageElement and remove the padding given to the parent
   * @param image_upload
   * @param imageEle
   */
  onImageSelect(image_upload: HTMLInputElement) {
    if (image_upload.files) {
      const image = image_upload.files[0];
      const allowedTypes = ['image/png', 'image/jpeg'];
      if (!allowedTypes.includes(image.type)) {
        this.utilityService.showError('Invalid file type. Only PNG, JPG, and JPEG images are allowed.')
        return;
    }
      if (image.size > 5 * 1024 * 1024) {
        this.utilityService.showError('File size exceeds 5MB limit')
        return;
      }

      this.service.uploadProfileImage(image).
      subscribe({
        next:(res)=>{
      this.loggedInUser.profileImage = res?.data?.profileImage;
      localStorage.setItem('userData', JSON.stringify(this.loggedInUser));
      // this.sidebarService.profileImg.set(res?.data?.profileImage);
      const localImageUrl = URL.createObjectURL(image);
      this.sidebarService.profileImg.set(localImageUrl);
      this.utilityService.handleResponse(res);
        },
        error:(err)=>{
          this.utilityService.handleError(err)
        }
      })
      
    }
  }

  /**
   * set the default image to the profile photo by setting the new image src and add the padding
   * @param display_image
   */
  removeDP() {
    this.service.removeProfileImage().
    subscribe({
      next:(res)=>{
      this.loggedInUser.profileImage = res?.data?.profileImage;
      localStorage.setItem('userData', JSON.stringify(this.loggedInUser));
      this.sidebarService.profileImg.set(res?.data?.profileImage);
      this.utilityService.handleResponse(res);
      },
      error:(err)=>{
        this.utilityService.handleError(err);
      }
    })
  }

  /**
   * Function to split classes
   * @param classes 
   * @returns 
   */
  splitClasses(classes:any[]) {
    const result:any[] = [];
    classes.forEach(obj => {
        const subjectName = obj.subject;
        const { subjectDetails } = obj;
        subjectDetails.forEach((detail:any) => {
            result.push({
              ...obj,
              subject: detail.subjectName,
              sem:detail.sem,
              name:subjectName
            });
        });
    });
    result.forEach((ele:any)=>{
      delete ele.subjectDetails
      delete ele.boysStrength
      delete ele.girlsStrength
    })
    return result;
}

  /**
   * save the profile info and redirect the user to the home page
   */
  onSave() {
    this.submitted = true;

    if (this.classes.controls.length === 0) {
      return;
    }
    if (this.userPorfileForm.invalid) {
      return;
    }

    const classDetails = this.splitClasses(this.classes.value);

    if(this.utilityService.hasDuplicates(classDetails)){
      this.utilityService.showWarning('Duplicate class-subject mapping found. Please verify.');
      return
    }

    const data = this.userPorfileForm.value;
    data.facilities = this.utilityService.removeObjectsWithEmptyType(
      data.facilities
    );

    data.classes = classDetails;

    this.service.updateProfile(data).subscribe({
      next: (res) => {
        this.utilityService.handleResponse(res);
        localStorage.setItem('userData', JSON.stringify(res.data));
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.utilityService.handleError(err);
      },
    });
  }

  openConfirmPopupforDeleteClass(i:any){
    this.selectedClassIndex = i;
    this.showDeleteClassDetailsConfirm = true;
  }

  closeDeleteClass(value: string) {
    if (value === 'delete') {
      this.deleteclass(this.selectedClassIndex);
    }
    this.showDeleteClassDetailsConfirm = false;
  }

  openConfirmPopupforDeleteResource(i:any){
    this.selectedResIndex = i;
    this.showDeleteResourceConfirm = true;
  }

  closeDeleteResource(value: string) {
    if (value === 'delete') {
      this.removeResource(this.selectedResIndex);
    }
    this.showDeleteResourceConfirm = false;
  }

  closeDeleteProfileImage(value:string){
    if(value === 'delete'){
      this.removeDP()
    }
    this.showDeleteProfileImageConfirm = false;
  }
  
  ngOnDestroy(): void {
    const profileUrl = this.utilityService.loggedInUserData?.profileImage || '';
    this.sidebarService.profileImg.set(profileUrl)
  }
}
