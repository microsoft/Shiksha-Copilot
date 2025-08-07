import { AfterViewInit, Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UtilityService } from 'src/app/core/services/utility.service';
import { FormDropDownConfig } from 'src/app/shared/interfaces/form-dropdown.interface';
import { UserManagementService } from '../user-management.service';
import { MasterService } from 'src/app/shared/services/master.service';
import { StaffUserCommonService } from 'src/app/shared/services/staff-user-common.service';

@Component({
  selector: 'app-add-edit-user',
  templateUrl: './add-edit-user.component.html',
  styleUrls: ['./add-edit-user.component.scss']
})
export class AddEditUserComponent implements OnInit, AfterViewInit {
  stateDropdownOptions: any[] = [];
  zoneDropdownOptions: any[] = [];
  districtDropdownOptions: any[] = [];
  blockDropdownOptions: any[] = [];

  schoolNamesDropdownOptions: any[] = [];

  userRolesDropdownOptions: any[] = [];

  stateDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select state',
    height: '44px',
    fieldName: 'State',
    bindLable: 'state',
    bindValue: 'state',
    required: true
  };

  zoneDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Zone',
    height: '44px',
    fieldName: 'Zone',
    bindLable: 'name',
    bindValue: 'name',
    required: true
  };

  districtDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select district',
    height: '44px',
    fieldName: 'District',
    bindLable: 'name',
    bindValue: 'name',
    required: true
  };

  blockDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Taluk',
    height: '44px',
    fieldName: 'Taluk',
    bindLable: 'name',
    bindValue: 'name',
    required: true
  };


  schoolNameDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select School Name',
    height: '44px',
    fieldName: 'School Name',
    bindLable: 'name',
    bindValue: '_id',
    required: true,
    searchable: true
  };

  userRoleDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Teacher Role',
    height: '44px',
    fieldName: 'Teacher Role',
    bindLable: 'name',
    bindValue: 'value',
    required: true
  };

  toggleconfig = {
    color: {
      checked: '#4069E5',
      unchecked: '#dcdcdc',
    }
  };
  addForm!: FormGroup;
  submitted: boolean = false;
  mode!: any;
  userId!: string;
  initialSchoolValue: any;

  regionsData: any;

  selectedStateObj: any;

  selectedZoneObj: any;

  selectedDistrictObj: any;

  dependentPatchData: any;
  schools: any;

  savedSchoolId:any;

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private utilityService: UtilityService, private userManagementService: UserManagementService, private router: Router, private masterService: MasterService,private commonStaffUserService:StaffUserCommonService) { }

  ngOnInit(): void {
    this.userRolesDropdownOptions = this.userManagementService.userRoleDropdownOptions;
    this.route.queryParamMap.subscribe((qparams) => {
      this.mode = qparams?.get('mode');
    });

    this.route.params.subscribe((params) => {
      this.userId = params['id'];
      if (this.userId) {
        this.getUserDetails(this.userId);
      }
    });

    this.initialize_add_form();
    if (this.mode !== 'view' || this.mode !== 'edit') {
      this.getRegionsData();
    }
  }

  ngAfterViewInit(): void {
    this.f.state?.valueChanges.subscribe((val: any) => {
      if (this.selectedStateObj && this.selectedStateObj.state !== val) {
        this.f.zone?.reset();
        this.zoneDropdownOptions = [];
      }
      this.setZoneDropdownValues(val);
    });

    this.f.zone?.valueChanges.subscribe((val: any) => {
      if (this.selectedZoneObj && this.selectedZoneObj.name !== val) {
        this.f.district?.reset();
        this.districtDropdownOptions = [];
      }
      this.setDistrictDropdownValues(val);
    });

    this.f.district?.valueChanges.subscribe((val: any) => {
      if (this.selectedDistrictObj && this.selectedDistrictObj.name !== val) {
        this.f.block?.reset();
        this.blockDropdownOptions = []
      }
      this.setBlockDropdownValues(val);
    });

    this.f.block?.valueChanges.subscribe((val:any)=>{
      this.schoolNamesDropdownOptions = [];
      this.f.school?.reset();
      if(val){
        this.getSchoolList();
      }
    })


    
   



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
    this.f.state?.setValue(this.dependentPatchData.state);
    this.f.zone?.setValue(this.dependentPatchData.zone);
    this.f.district?.setValue(this.dependentPatchData.district);
    this.f.block?.setValue(this.dependentPatchData.block);
    this.f.school?.setValue(this.dependentPatchData.school._id);
  }

  getSchoolList() {
    
      const filters = {
        state:this.addForm.get('state')?.value,
        district:this.addForm.get('district')?.value,
        zone:this.addForm.get('zone')?.value,
        block:this.addForm.get('block')?.value
      }
      this.userManagementService.getSchoolList(false,filters).subscribe((res: any) => {
        this.schools = res.data['results'];
        this.schoolNamesDropdownOptions = this.schools.map((school: { _id: string, name: string }) => ({
          _id: school._id,
          name: school.name
        }));
      });
  }

  initialize_add_form() {
    this.addForm = this.fb.group({
      name: [null, [Validators.required,Validators.minLength(5)]],
      phone: ['', [Validators.required, Validators.minLength(10), Validators.pattern(this.utilityService.regexPattern.phoneRegex)]],
      state: [null, [Validators.required]],
      zone: [null, [Validators.required]],
      district: [null, [Validators.required]],
      block: [null, [Validators.required]],
      school: [null, [Validators.required]],
      role: [null, [Validators.required]],
    });
    this.getRegionsData();
    this.patchStatus();
  }

  on_form_submit() {
    this.submitted = true;
    if (this.addForm.invalid) {
      return
    }
      const currentSchoolValue = this.f.school?.value;
      if (this.mode === 'edit') {
        
        const updatedData = {
          ...this.addForm.value,
          isSchoolChanged:this.savedSchoolId !== this.addForm.value.school
        }
        // Check if the school value has changed
        if (currentSchoolValue !== this.initialSchoolValue){
          this.userManagementService.editUserDetails(this.userId, updatedData).subscribe({
            next: (res: any) => {
              this.router.navigate(['/admin/user-management/list']);
              this.utilityService.handleResponse(res);
            },
            error: (err) => {
              console.error(err);
              this.utilityService.handleError(err);
            }
          });
        }
        else{
          this.userManagementService.editUserDetails(this.userId, this.addForm.value).subscribe({
            next: (res: any) => {
              this.router.navigate(['/admin/user-management/list']);
              this.utilityService.handleResponse(res);
            },
            error: (err) => {
              console.error(err);
              this.utilityService.handleError(err);
            }
          });
        }  
        
      }
      else {
  
        this.commonStaffUserService.addUser(this.addForm.value,'user').subscribe({
          next: (res: any) => {
            this.router.navigate(['/admin/user-management/list']);
            this.utilityService.handleResponse(res);
          },
          error: (err) => {
            console.error(err);
            this.utilityService.handleError(err);
          }
        });
      }
    
   
  }

  convertToFormControl(absCtrl: AbstractControl | null): UntypedFormControl {
    return absCtrl as UntypedFormControl;
  }

  get f(): any {
    return this.addForm.controls;
  }

  patchStatus() {
    if (this.addForm.value.isDeleted === false) {
      this.addForm.patchValue({
        isDeleted: true
      });
    } else {
      this.addForm.patchValue({
        isDeleted: false
      });
    }
  }

  setFormValue(data: any) {
    const keysToRemove = [
      'state',
      'zone',
      'district',
      'block',
      'school'
    ];
    const { newObj, removedObj } = this.utilityService.removeKeys(
      data,
      keysToRemove
    );
    newObj.role = newObj.role[0];
    this.dependentPatchData = removedObj;
    this.getRegionsData();
    this.addForm.patchValue(newObj);

    this.initialSchoolValue = newObj.school; // Set the initial school value
    
  }

  getUserDetails(id: string) {
    this.commonStaffUserService.getUserDetails(id,'user').subscribe({
      next: (res: any) => {        
        const userData = res.data;
        this.savedSchoolId = userData?.school?._id
        this.setFormValue(userData);
        this.patchStatus();
      },
      error: (err) => {
        console.error(err);
        this.utilityService.handleError(err);
      }
    });
  }

}
