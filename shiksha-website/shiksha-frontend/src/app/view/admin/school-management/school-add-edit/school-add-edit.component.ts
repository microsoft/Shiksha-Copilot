import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  UntypedFormArray,
  UntypedFormControl,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UtilityService } from 'src/app/core/services/utility.service';
import { FormDropDownConfig } from 'src/app/shared/interfaces/form-dropdown.interface';
import { SchoolManagementService } from '../school-management.service';
import { ModalService } from 'src/app/shared/components/modal/modal.service';
import {
  BULK_UPLOAD_FILE_TYPES,
  CLASS_OPTIONS,
  MEDIUMS,
} from 'src/app/shared/utility/constant.util';
import { MasterService } from 'src/app/shared/services/master.service';
import { DatePipe } from '@angular/common';
import { DropDownConfig } from 'src/app/shared/interfaces/dropdown.interface';
import { Subscription } from 'rxjs';

interface MinMaxDate{
  currentYearMin:Date,
  currentYearMax:Date,
  nextYearMin:Date,
  nextYearMax:Date
}

@Component({
  selector: 'app-school-add-edit',
  templateUrl: './school-add-edit.component.html',
  styleUrls: ['./school-add-edit.component.scss'],
})
export class SchoolAddEditComponent implements OnInit, AfterViewInit, OnDestroy {
  schoolAddEditForm!: FormGroup;

  submitted = false;

  mode: any;

  schoolId!: string;

  stateDropdownOptions: any[] = [];

  zoneDropdownOptions: any[] = [];

  districtDropdownOptions: any[] = [];

  blockDropdownOptions: any[] = [];

  boardDropdownOptions: any[] = [];

  mediumDropdownOptions: any[] = [];

  resourceTypeDropdownOptions: any[] = [];

  resourceDetailsDropdownOptions: any[] = [];

  resourceOtherValue: any[] = [''];

  schoolIdError: boolean = false;

  stateDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select state',
    height: '44px',
    fieldName: 'State',
    bindLable: 'state',
    bindValue: 'state',
    required: true,
  };

  zoneDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Zone',
    height: '44px',
    fieldName: 'Zone',
    bindLable: 'name',
    bindValue: 'name',
    required: true,
  };

  districtDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select district',
    height: '44px',
    fieldName: 'District',
    bindLable: 'name',
    bindValue: 'name',
    required: true,
  };

  blockDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Taluk',
    height: '44px',
    fieldName: 'Taluk',
    bindLable: 'name',
    bindValue: 'name',
    required: true,
  };

  boardDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select board',
    height: '44px',
    fieldName: 'Board',
    bindLable: 'boardName',
    bindValue: 'abbreviation',
    multi: true,
    chipValueType: 'uppercase',
    required: true,
  };

  mediumDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select medium of instruction',
    height: '44px',
    fieldName: 'Medium of instruction',
    bindLable: 'name',
    bindValue: 'value',
    multi: true,
    required: true,
  };

  resourceTypeDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select Type',
    height: 'auto',
    fieldName: 'Type',
    hideLabel: true,
    bindLable: 'type',
    bindValue: 'type',
    required: true,
    clearableOff:true
  };

  resourceTypeDarkDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Type',
    height: 'auto',
    fieldName: 'Type',
    hideLabel: true,
    bindLable: 'type',
    bindValue: 'type',
    required: true,
    clearableOff:true
  };

  resourceDetailsDropdownconfig: FormDropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Select details',
    height: 'auto',
    fieldName: 'Details',
    multi: true,
    clearableOff: true,
    hideLabel: true,
    hideChips: true,
    required: true,
  };

  classBoardOptions: any[] = [];

  classBoardDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Board',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'name',
    labelTxt: 'Board',
    required: true,
    clearableOff: true,
  };

  classMediumOptions: any[] = [];

  classMediumDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Medium',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'value',
    labelTxt: 'Medium',
    required: true,
    clearableOff: true,
  };

  classOptions: any[] = CLASS_OPTIONS;

  classMinDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Min class',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'name',
    labelTxt: 'Min class',
    required: true,
    clearableOff: true,
  };

  classMaxDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Max class',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'name',
    labelTxt: 'Max class',
    required: true,
    clearableOff: true,
  };

  uploadFileTypes = BULK_UPLOAD_FILE_TYPES;

  fileToUpload!: File;

  regionsData: any;

  selectedStateObj: any;

  selectedZoneObj: any;

  selectedDistrictObj: any;

  classes: any[] = [];

  dependentPatchData: any;

  resourceMasterData: any;

  academicYearStartDate: any;

  academicYearEndDate: any;

  previousClasses: any;

  paramSubscription!:Subscription;

  queryParamSubscription!:Subscription;

  minMaxDateValues!:MinMaxDate;

  showFacilityDeleteConfirm=false;

  deleteIndex:any;

  /**
   * Class constructor
   * @param fb FormBuilder
   * @param utilityService UtilityService
   * @param route ActivatedRoute
   * @param schoolManagementService SchoolManagementService
   * @param modalService ModalService
   * @param masterService MasterService
   * @param router Router
   * @param datePipe DatePipe
   */
  constructor(
    private fb: FormBuilder,
    private utilityService: UtilityService,
    private route: ActivatedRoute,
    private schoolManagementService: SchoolManagementService,
    public modalService: ModalService,
    private masterService: MasterService,
    private router: Router,
    private datePipe: DatePipe
  ) {}

  /**
   * Angular oninit lifecycle hook used here for form initialization
   */
  ngOnInit(): void {
    this.setCurrentAcademicYear();
    this.createAddEditForm();
   this.queryParamSubscription = this.route.queryParamMap.subscribe((qparams) => {
      this.mode = qparams?.get('mode');
    });

    this.paramSubscription = this.route.params.subscribe((params) => {
      this.schoolId = params['id'];
      if (this.schoolId) {
        this.getSchoolData(this.schoolId);
      }
    });
    if (this.mode !== 'edit' && this.mode !== 'view') {
      this.getRegionsData();
      this.getResourceData();
      this.getBoardData();
      this.createBoard();
      this.mediumDropdownOptions = structuredClone(MEDIUMS);
    }
  }

  /**
   * Function to set current academic year start and end date
   */
  setCurrentAcademicYear() {
    const today = new Date();
    const currentYear = today.getFullYear();

    const minMaxVals = {
      currentYearMin:new Date(currentYear, 0, 1),
      currentYearMax : new Date(currentYear, 11, 31),
      nextYearMin : new Date(currentYear + 1, 0, 1),
      nextYearMax : new Date(currentYear + 1, 11, 31)
    }
    this.minMaxDateValues = minMaxVals

    this.academicYearStartDate = this.datePipe.transform(
      new Date(currentYear, 5, 1),
      'yyyy-MM-dd'
    );
    this.academicYearEndDate = this.datePipe.transform(
      new Date(currentYear + 1, 2, 31),
      'yyyy-MM-dd'
    );
  }

  /**
   * Angular aferview init hook used here to list dropdown changes
   */
  ngAfterViewInit(): void {
    this.f.state?.valueChanges.subscribe((val: any) => {
      if (this.selectedStateObj && this.selectedStateObj.state !== val) {
        this.f.zone?.reset();
      }
      this.setZoneDropdownValues(val);
    });

    this.f.zone?.valueChanges.subscribe((val: any) => {
      if (this.selectedZoneObj && this.selectedZoneObj.name !== val) {
        this.f.district?.reset();
      }
      this.setDistrictDropdownValues(val);
    });

    this.f.district?.valueChanges.subscribe((val: any) => {
      if (this.selectedDistrictObj && this.selectedDistrictObj.name !== val) {
        this.f.block?.reset();
      }
      this.setBlockDropdownValues(val);
    });

    this.f.boards?.valueChanges.subscribe((val: any) => {
      this.classBoardOptions = structuredClone(val);
      this.classDetailsUpdate('board', this.classBoardOptions);
    });

    this.f.mediums?.valueChanges.subscribe((val: any) => {
      const medium = MEDIUMS.filter((ele) => val.includes(ele.value));
      this.classMediumOptions = structuredClone(medium);
      this.classDetailsUpdate('medium', this.classMediumOptions);
    });
  }

  /**
   * Function to update class details on board and medium changes
   * @param type
   * @param options
   */
  classDetailsUpdate(type: any, options: any[]) {
    if (this.mode !== 'view') {
      let filteredArr = [];
      for (const classVal of this.classes) {
        if (classVal[type] && !options.includes(classVal[type])) {
          filteredArr = this.classes.filter(
            (ele) => ele[type] !== classVal[type]
          );
        }
      }
      if (filteredArr.length === 0) {
        if (options.length === 0) {
          this.classes = [];
          this.createBoard();
        }
      } else {
        this.classes = filteredArr;
      }
    }
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

  /**
   * Method to create school add edit form
   */
  createAddEditForm() {
    this.schoolAddEditForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(5)]],
        schoolId: ['', [Validators.required, Validators.minLength(11)]],
        boards: [null, [Validators.required]],
        mediums: [null, [Validators.required]],
        state: [null, [Validators.required]],
        district: [null, [Validators.required]],
        block: [null, [Validators.required]],
        zone: [null, [Validators.required]],
        academicYearStartDate: [
          this.academicYearStartDate,
          [Validators.required],
        ],
        academicYearEndDate: [this.academicYearEndDate, [Validators.required]],
        holidayList: this.fb.array([]),
        facilities: this.fb.array([]),
      },
      {
        validator: this.dateRangeValidator,
      }
    );
    this.addHoliday();
    this.addResource();
  }

  /**
   * prevent the user to enter more than 10 digit of mobile number
   * @param event
   */
  checkLimit(event: KeyboardEvent) {
    let input = event.target as HTMLInputElement;
    const inputValue = input.value;
    if (this.schoolAddEditForm.get('schoolId')?.value) {
      if (inputValue.length === 11) {
        this.schoolIdError = false;
        event.preventDefault();
      }
    }
  }

  /**
   * Function to update school id error
   */
  updateError() {
    if (this.schoolAddEditForm.get('schoolId')?.value) {
      if (
        this.schoolAddEditForm.get('schoolId')?.value.toString().length === 11
      ) {
        this.schoolIdError = false;
      } else {
        this.schoolIdError = true;
      }
    }
  }

  /**
   * Function to get regions data
   */
  getRegionsData() {
    this.masterService.getRegions().subscribe({
      next: (val) => {
        this.regionsData = val?.data?.results;
        this.setStateDropdownValues(this.regionsData);
        if (this.mode === 'edit' || this.mode === 'view') {
          this.patchRegionDropDown();
        }
      },
    });
  }

  /**
   * Function to patch regions data
   */
  patchRegionDropDown() {
    this.f.state.setValue(this.dependentPatchData.state);
    this.f.zone.setValue(this.dependentPatchData.zone);
    this.f.district.setValue(this.dependentPatchData.district);
    this.f.block.setValue(this.dependentPatchData.block);
  }

  /**
   * Function to get board data
   */
  getBoardData() {
    this.masterService.getBoards().subscribe({
      next: (val) => {
        this.boardDropdownOptions = val?.data?.results;

        if (this.mode === 'edit') {
          this.boardDropdownOptions.forEach((ele) => {
            if (
              this.schoolAddEditForm.value.boards.includes(ele.abbreviation)
            ) {
              ele.disabled = true;
            }
          });

          this.mediumDropdownOptions = structuredClone(MEDIUMS);

          this.mediumDropdownOptions.forEach((ele) => {
            if (this.schoolAddEditForm.value.mediums.includes(ele.value)) {
              ele.disabled = true;
            }
          });
        }
      },
    });
  }

  /**
   * Function to get resource data
   */
  getResourceData() {
    this.masterService.getFacilities().subscribe({
      next: (val) => {
        this.resourceTypeDropdownOptions = val?.data?.results;

        const otherObj = {
          type: 'Others',
        };

        this.resourceTypeDropdownOptions.push(otherObj);

        this.resourceMasterData = val?.data?.results;
        if (this.mode === 'edit' || this.mode === 'view') {
          this.patchResourceDropdown();
        }
      },
    });
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
          ?.setValue(this.dependentPatchData.facilities[i].details);
        this.facilities.controls[i]
          .get('details')
          ?.setValidators(Validators.required);
        this.facilities.controls[i].get('details')?.updateValueAndValidity();
      }
    }
  }

  /**
   * Function to set state dropdown values
   * @param val
   */
  setStateDropdownValues(val: any) {
    this.stateDropdownOptions = val;
  }

  /**
   * Function to set zone dropdown values
   * @param selectedStateValue
   */
  setZoneDropdownValues(selectedStateValue: any) {
    if (selectedStateValue) {
      this.selectedStateObj = this.utilityService.filterDropdownValues(
        this.regionsData,
        'state',
        selectedStateValue
      );
      this.zoneDropdownOptions = this.selectedStateObj.zones;
    } else {
      this.f.zone?.reset();
    }
  }

  /**
   * Function to set district dropdown values
   * @param selectedZone
   */
  setDistrictDropdownValues(selectedZone: any) {
    if (selectedZone) {
      this.selectedZoneObj = this.utilityService.filterDropdownValues(
        this.selectedStateObj.zones,
        'name',
        selectedZone
      );
      this.districtDropdownOptions = this.selectedZoneObj.districts;
    } else {
      this.f.district?.reset();
    }
  }

  /**
   * Function to set block dropdown values
   * @param selectedDistrict
   */
  setBlockDropdownValues(selectedDistrict: any) {
    if (selectedDistrict) {
      this.selectedDistrictObj = this.utilityService.filterDropdownValues(
        this.selectedZoneObj.districts,
        'name',
        selectedDistrict
      );
      this.blockDropdownOptions = this.selectedDistrictObj.blocks;
    } else {
      this.f.block?.reset();
    }
  }

  /**
   * Function triggered on class range selection
   * @param i
   * @param key
   * @param value
   */
  classRangeUpdate(i: any, key: any, value: any) {
    if (this.mode === 'edit') {
      this.editClassRange(i, key, value);
    } else {
      this.updateClassRange(i, key, value);
    }
  }

  updateClassRange(i: any, key: any, value: any) {
    if (!value) {
      this.classes[i].classDetails = [];
    }

    if (this.classes[i].start && this.classes[i].end) {
      if (this.classes[i].start > this.classes[i].end) {
        this.utilityService.showWarning(
          `please select appropriate value for ${
            key === 'start' ? 'min' : 'max'
          } class`
        );
        setTimeout(() => {
          this.classes[i][key] = null;
          this.classes[i].classDetails = [];
        }, 0);
      } else {
        this.addClasses(this.classes[i].start, this.classes[i].end, i);
      }
    }
  }

  /**
   * Function to create board based on range
   * @param start
   * @param end
   */
  createBoard() {
    const boardObj = {
      board: null,
      medium: null,
      start: null,
      end: null,
      classDetails: [],
    };

    this.classes.push(boardObj);
  }

  /**
   * Function to remove board
   * @param i
   */
  removeBoard(i: any) {
    this.classes.splice(i, 1);
  }

  /**
   * Function to add classes for specified range
   * @param start
   * @param end
   * @param i
   */
  addClasses(start: any, end: any, i: any) {
    this.classes[i].classDetails = [];

    for (let j = start; j <= end; j++) {
      this.classes[i].classDetails.push(this.getClassObj(j));
    }
  }

  /**
   * Function to delete section form class
   * @param i
   * @param j
   */
  deleteSection(i: any, j: any) {
    this.classes[i].section.splice(j, 1);
  }

  /**
   * Function to get School data
   * @param id school id
   */
  getSchoolData(id: any) {
    this.schoolManagementService.getSchoolData(id).subscribe({
      next: (val) => {
        this.setFormValue(val.data);
      },
    });
  }

  /**
   * Function to set value to form
   * @param data
   */
  setFormValue(data: any) {
    for (let i = 0; i < data.holidayList.length - 1; i++) {
      this.addHoliday();
    }

    const keysToRemove = [
      'state',
      'zone',
      'district',
      'block',
      'classes',
      'facilities',
    ];
    const { newObj, removedObj } = this.utilityService.removeKeys(
      data,
      keysToRemove
    );
    this.dependentPatchData = removedObj;
    this.getResourceData();
    this.getRegionsData();

    newObj.academicYearStartDate = this.datePipe.transform(
      newObj?.academicYearStartDate,
      'yyyy-MM-dd'
    );
    newObj.academicYearEndDate = this.datePipe.transform(
      newObj?.academicYearEndDate,
      'yyyy-MM-dd'
    );

    newObj.holidayList.forEach((holiday: any) => {
      holiday.date = this.datePipe.transform(holiday.date, 'yyyy-MM-dd');
    });

    this.schoolAddEditForm.patchValue(newObj);

    if (
      this.dependentPatchData?.facilities &&
      this.dependentPatchData?.facilities.length > 0
    ) {
      for (let i = 0; i < data.facilities.length - 1; i++) {
        this.addResource();
      }
    }

    this.getBoardData();

    this.classes = data.classes;

    this.previousClasses = structuredClone(this.classes);

    if (this.mode === 'view') {
      this.disableFields();
    }
    if (this.mode === 'edit') {
      this.disableBoardFields();
    }
  }

  boardMediumUpdate(i: any, type: any) {
    if(this.mode === 'edit'){
      switch (type) {
        case 'board':
          if (this.previousClasses[i]?._id) {
            this.utilityService.showWarning(
              'Board cannot be updated for existing board-medium combination'
            );
            setTimeout(() => {
              this.classes[i].board = this.previousClasses[i].board;
            }, 0);
          }
          break;
        case 'medium':
          if (this.previousClasses[i]?._id) {
            this.utilityService.showWarning(
              'Medium cannot be updated for existing board-medium combination'
            );
            setTimeout(() => {
              this.classes[i].medium = this.previousClasses[i].medium;
            }, 0);
          }
          break;
  
        default:
          break;
      }
    }
  }

  editClassRange(i: any, key: any, value: any) {
    if (this.previousClasses[i]?._id) {
      switch (key) {
        case 'start':
          if (value > this.previousClasses[i].start) {
            this.utilityService.showWarning(
              `Minimum class cannot exceed ${this.previousClasses[i].start}.`
            );
            setTimeout(() => {
              this.classes[i][key] = this.classes[i].classDetails[0].standard;
            }, 0);
          } else {
            const classAvailable = this.classes[i].classDetails.map(
              (ele: any) => ele.standard
            );
            const removeCouter = classAvailable.indexOf(value);
            if (removeCouter !== -1) {
              this.classes[i].classDetails.splice(0, removeCouter);
            }
            for (let j = this.previousClasses[i].start - 1; j >= value; j--) {
              if (!classAvailable.includes(this.getClassObj(j).standard)) {
                this.classes[i].classDetails.unshift(this.getClassObj(j));
              }
            }
          }
          break;

        case 'end':
          if (value < this.previousClasses[i].end) {
            this.utilityService.showWarning(
              `Maximum class cannot be less than ${this.previousClasses[i].end}.`
            );
            setTimeout(() => {
              this.classes[i][key] =
                this.classes[i].classDetails[
                  this.classes[i].classDetails.length - 1
                ].standard;
            }, 0);
          } else {
            const classAvailable = this.classes[i].classDetails.map(
              (ele: any) => ele.standard
            );
            const removeCouter = classAvailable.indexOf(value);
            if (removeCouter !== -1) {
              this.classes[i].classDetails.splice(
                removeCouter + 1,
                this.classes[i].classDetails.length - 1
              );
            }
            for (let j = this.previousClasses[i].end + 1; j <= value; j++) {
              if (!classAvailable.includes(this.getClassObj(j).standard)) {
                this.classes[i].classDetails.push(this.getClassObj(j));
              }
            }
          }
          break;

        default:
          break;
      }
    } else {
      this.updateClassRange(i, key, value);
    }
  }

  getClassObj(j: any) {
    const classObj = {
      standard: j,
      section: 'A',
      boysStrength: null,
      girlsStrength: null,
      totalStrength: null,
    };
    return classObj;
  }

  /**
   * Function to disable input fields
   */
  disableFields() {
    this.schoolAddEditForm?.disable();
    this.districtDropdownconfig.isBackground = true;
    this.mediumDropdownconfig.isBackground = true;
    this.blockDropdownconfig.isBackground = true;
    this.boardDropdownconfig.isBackground = true;
    this.zoneDropdownconfig.isBackground = true;
    this.stateDropdownconfig.isBackground = true;
    this.mediumDropdownconfig.chipClearableOff = true;
    this.boardDropdownconfig.chipClearableOff = true;
    
    this.classBoardDropdownconfig.disabled = true;
    this.classMediumDropdownconfig.disabled = true;
    this.classMinDropdownconfig.disabled = true;
    this.classMaxDropdownconfig.disabled = true;
    this.classBoardDropdownconfig.isBackground = true;
    this.classMediumDropdownconfig.isBackground = true;
    this.classMinDropdownconfig.isBackground = true;
    this.classMaxDropdownconfig.isBackground = true;
    this.disableBoardFields();
  }

  /**
   * Function to disable board fields
   */
  disableBoardFields() {
    this.mediumDropdownconfig.chipClearableOff = true;
    this.boardDropdownconfig.chipClearableOff = true;
  }

  /**
   * getter for holiday list
   */
  get holidayList() {
    return this.schoolAddEditForm.get('holidayList') as UntypedFormArray;
  }

  /**
   * getter for facilities
   */
  get facilities() {
    return this.schoolAddEditForm.get('facilities') as UntypedFormArray;
  }

  /**
   * Function to update total strength
   * @param boysStrength
   * @param girlsStrength
   * @param classIndex
   * @param sectionIndex
   */
  updateTotalStrength(
    boysStrength: number,
    girlsStrength: number,
    classIndex: number,
    sectionIndex: number
  ) {
    this.classes[classIndex].classDetails[sectionIndex].totalStrength =
      +boysStrength + +girlsStrength;
  }

  /**
   * Function to add holiday control
   */
  addHoliday() {
    this.holidayList.push(
      this.fb.group({
        date: [''],
        reason: [''],
      })
    );
  }

  /**
   * Function to remove holiday control
   * @param index
   */
  removeHoliday(index: any) {
    this.holidayList.removeAt(index);
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
    if(this.facilities.controls[index].value?.type === 'Others' && this.mode === 'edit'){
      this.showFacilityDeleteConfirm = true;
      this.deleteIndex = index
    } else {
      this.facilities.removeAt(index);
      this.resourceOtherValue = this.resourceOtherValue.splice(index, 1);
    }
  }

  updateFacility(val:any){
    this.showFacilityDeleteConfirm=false;
    if(val === 'delete'){
  this.schoolManagementService.updateFacility(this.schoolId,this.facilities.controls[this.deleteIndex].value).
    subscribe({
      next:(res)=>{
        this.utilityService.handleResponse(res);
        this.facilities.removeAt(this.deleteIndex);
        this.resourceOtherValue = this.resourceOtherValue.splice(this.deleteIndex, 1);
      },
      error:(err)=>{
        this.utilityService.handleError(err)
      }
    })
    }
  
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
   * getter for formcontrol
   */
  get f(): any {
    return this.schoolAddEditForm.controls;
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
   * Function to edit school details
   */
  editSchoolDetails() {
    this.router.navigateByUrl('/empty', { skipLocationChange: true }).then(() => {
      this.router.navigate([`/admin/school-management/${this.schoolId}`], {
        relativeTo: this.route,
        queryParams: { mode: 'edit' },
      });
    });
  }

  /**
   * Function to open bulk upload popup
   */
  blukUpload() {
    this.modalService.showBlukUploadDialog = true;
  }

  /**
   * Function triggerd on file upload
   * @param fileDetails
   */
  uploadedFile(fileDetails: any) {
    this.fileToUpload = fileDetails.file;
  }

  /**
   * Function triggered on upload
   * @param isUpload
   */
  upload(isUpload: boolean) {
    if (isUpload) {
      console.log('upload file logic here');
      console.log(this.fileToUpload);
    }
  }

  /**
   * Function triggered on submit
   */
  onSubmit() {
    this.submitted = true;

    if (this.schoolAddEditForm.get('schoolId')?.value.toString().length < 11) {
      this.schoolIdError = true;
      return;
    }

    if (this.schoolAddEditForm.invalid) {
      return;
    }

    if (!this.utilityService.validateArray(this.classes)) {
      return;
    }

    if (this.utilityService.hasDuplicateBoardMedium(this.classes)) {
      this.utilityService.showWarning(
        'Duplicate board-medium mapping found. Please verify.'
      );
      return;
    }

    let data = {
      ...this.schoolAddEditForm.value,
      classes: this.classes,
    };
    data.holidayList = this.utilityService.removeEmptyObjects(data.holidayList);
    data.facilities = this.utilityService.removeObjectsWithEmptyType(
      data.facilities
    );
    if (this.mode === 'edit') {
      this.schoolManagementService.updateSchool(data, this.schoolId).subscribe({
        next: (res) => {
          this.utilityService.handleResponse(res);
          this.router.navigate(['/admin/school-management']);
        },
        error: (err) => {
          this.utilityService.handleError(err);
        },
      });
    } else {
      this.schoolManagementService.createSchool(data).subscribe({
        next: (res) => {
          this.utilityService.handleResponse(res);
          this.router.navigate(['/admin/school-management']);
        },
        error: (err) => {
          this.utilityService.handleError(err);
        },
      });
    }
  }

  dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('academicYearStartDate')?.value;
    const endDate = control.get('academicYearEndDate')?.value;

    if (!startDate || !endDate) {
      return null;
    }

    if (startDate > endDate) {
      return { lessThanStart: true };
    }
    return null;
  }

  ngOnDestroy(): void {
    this.paramSubscription.unsubscribe();
    this.queryParamSubscription.unsubscribe();
  }
}
