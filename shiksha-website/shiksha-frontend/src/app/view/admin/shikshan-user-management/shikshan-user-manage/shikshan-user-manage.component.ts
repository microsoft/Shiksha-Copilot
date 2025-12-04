import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UtilityService } from 'src/app/core/services/utility.service';
import { FormDropDownConfig } from 'src/app/shared/interfaces/form-dropdown.interface';
import { ShikshanService } from '../shikshan-user.service';
import { MasterService } from 'src/app/shared/services/master.service';
import { StaffUserCommonService } from 'src/app/shared/services/staff-user-common.service';

@Component({
  selector: 'app-shikshan-user-manage',
  templateUrl: './shikshan-user-manage.component.html',
  styleUrls: ['./shikshan-user-manage.component.scss']
})

export class ShikshanUserManageComponent implements OnInit {

  userRolesDropdownOptions: any[] = [];

  userRoleDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Staff Role',
    height: '44px',
    fieldName: 'Staff Role',
    bindLable: 'name',
    bindValue: 'value',
    required: true
  };

  stateDropdownOptions: any[] = [];
  zoneDropdownOptions: any[] = [];
  districtDropdownOptions: any[] = [];
  regionsData: any[] = [];

  stateDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select State',
    height: '44px',
    fieldName: 'State',
    bindLable: 'state',
    bindValue: 'state',
    required: true
  };

  zoneDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Zone',
    height: '44px',
    fieldName: 'Zone',
    bindLable: 'name',
    bindValue: 'name',
    required: true,
    multi: true,
    selectAllOption: true,
    hideChips: false,
    chipValueType: 'titlecase'
  };

  districtDropdownconfig: FormDropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select District',
    height: '44px',
    fieldName: 'District',
    bindLable: 'name',
    bindValue: 'name',
    required: true,
    multi: true,
    selectAllOption: true,
    hideChips: false,
    chipValueType: 'titlecase'
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

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private utilityService: UtilityService, private shikshanaUserService: ShikshanService, private router: Router, private masterService: MasterService,private commonStaffUserService:StaffUserCommonService) { }

  ngOnInit(): void {
    this.userRolesDropdownOptions = this.shikshanaUserService.userRoleDropdownOptions;

    this.route.queryParamMap.subscribe((qparams) => {
      this.mode = qparams?.get('mode');
    });

    this.route.params.subscribe((params) => {
      this.userId = params['id'];
    });

    this.initialize_add_form();
    this.getRegionsData();
    this.handleRoleChange();
  }

  initialize_add_form() {
    this.addForm = this.fb.group({
      name: [null, [Validators.required,Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.minLength(10), Validators.pattern(this.utilityService.regexPattern.phoneRegex)]],
      email: [null, [Validators.required, Validators.email]],
      role: [null, [Validators.required]],
      isDeleted: [false, [Validators.required]],
      state: [null],
      zones: [[]],
      districts: [[]]
    });
  }

  getRegionsData() {
    this.masterService.getRegions().subscribe({
      next: (val) => {
        this.regionsData = val?.data?.results || [];
        this.stateDropdownOptions = this.regionsData;
        if (this.userId) {
          this.getUserDetails(this.userId);
        }
      }
    });
  }

  handleRoleChange() {
    this.addForm.get('role')?.valueChanges.subscribe((role) => {
      if (role === 'manager') {
        this.addForm.get('state')?.setValidators([Validators.required]);
        this.addForm.get('zones')?.setValidators([Validators.required]);
        this.addForm.get('districts')?.setValidators([Validators.required]);
      } else {
        this.addForm.get('state')?.clearValidators();
        this.addForm.get('zones')?.clearValidators();
        this.addForm.get('districts')?.clearValidators();
        this.addForm.get('state')?.setValue(null);
        this.addForm.get('zones')?.setValue([]);
        this.addForm.get('districts')?.setValue([]);
      }
      this.addForm.get('state')?.updateValueAndValidity();
      this.addForm.get('zones')?.updateValueAndValidity();
      this.addForm.get('districts')?.updateValueAndValidity();
    });

    this.addForm.get('state')?.valueChanges.subscribe((state: string) => {
      this.updateZoneOptions(state);
    });

    this.addForm.get('zones')?.valueChanges.subscribe((selectedZones: any[]) => {
      this.updateDistrictOptions(selectedZones);
    });
  }

  updateZoneOptions(state: string) {
    if (!state) {
      this.zoneDropdownOptions = [];
      this.districtDropdownOptions = [];
      this.addForm.get('zones')?.setValue([]);
      this.addForm.get('districts')?.setValue([]);
      return;
    }

    // Find the selected state object
    const stateObj = this.regionsData.find((region: any) => region.state === state);
    
    if (stateObj && stateObj.zones) {
      // Transform zones into the correct format for the dropdown
      this.zoneDropdownOptions = stateObj.zones.map((zone: any) => ({
        name: zone.name,
        value: zone.name
      }));
    } else {
      this.zoneDropdownOptions = [];
    }

    // Reset selections when state changes
    this.addForm.get('zones')?.setValue([]);
    this.addForm.get('districts')?.setValue([]);
    this.districtDropdownOptions = [];
  }

  updateDistrictOptions(selectedZones: any[]) {
    if (!selectedZones || selectedZones.length === 0) {
      this.districtDropdownOptions = [];
      this.addForm.get('districts')?.setValue([]);
      return;
    }

    const state = this.addForm.get('state')?.value;
    const stateObj = this.regionsData.find((region: any) => region.state === state);
    
    if (!stateObj) {
      this.districtDropdownOptions = [];
      return;
    }

    // Collect all districts from selected zones
    const allDistricts = new Set();
    selectedZones.forEach(zoneName => {
      const zone = stateObj.zones.find((z: any) => z.name === zoneName);
      if (zone && zone.districts) {
        if (Array.isArray(zone.districts)) {
          zone.districts.forEach((district: any) => {
            if (district.name) {
              allDistricts.add(district.name);
            }
          });
        } else if (zone.districts.name) {
          allDistricts.add(zone.districts.name);
        }
      }
    });

    // Transform districts into dropdown format
    this.districtDropdownOptions = Array.from(allDistricts).map(districtName => ({
      name: districtName,
      value: districtName
    }));

    // Reset districts selection when zones change
    this.addForm.get('districts')?.setValue([]);
  }

  on_form_submit() {
    this.submitted = true;
    if (this.addForm.invalid) {
      return;
    }

    // Create a copy of the form value to avoid modifying the form directly
    const formData = { ...this.addForm.value };

    // Remove state, zones, and districts if the role is not 'manager'
    if (formData.role !== 'manager') {
      delete formData.state;
      delete formData.zones;
      delete formData.districts;
    }
    
    // Define the type for the formatted data
    interface FormattedData {
      _id?: string;
      name: string;
      phone: string;
      email: string;
      role: string[];
      isDeleted: boolean;
      state?: string;
      zones?: string[];
      districts?: string[];
    }
    
    // Format the data according to API requirements
    const formattedData: FormattedData = {
      name: formData.name?.trim(),
      phone: formData.phone?.toString(),
      email: formData.email?.trim().toLowerCase(),
      role: [formData.role],
      isDeleted: formData.isDeleted
    };

    // Add state, zones, and districts only if role is manager
    if (formData.role === 'manager') {
      if (!formData.state || !formData.zones?.length || !formData.districts?.length) {
        this.utilityService.handleError({ error: { message: 'State, zones, and districts are required for manager role' } });
        return;
      }
      formattedData.state = formData.state;
      formattedData.zones = formData.zones;
      formattedData.districts = formData.districts;
    }
    if (this.mode === 'edit') {
        formattedData._id = this.userId;
        this.shikshanaUserService.editUserDetails(this.userId, formattedData).subscribe({
          next: (res: any) => {
            this.router.navigate(['/admin/shikshana-user/list']);
            this.utilityService.handleResponse(res);
          },
          error: (err) => {
            console.error('Edit error:', err);
            console.error('Error details:', err.error);
            this.utilityService.handleError(err);
          }
        });
    } else {
        // For create, we need to send the data to the correct endpoint
        this.shikshanaUserService.createUser(formattedData).subscribe({
          next: (res: any) => {
            this.router.navigate(['/admin/shikshana-user/list']);
            this.utilityService.handleResponse(res)
          },
          error: (err) => {
            if (err.error?.error) {
            }
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

  getUserDetails(id: string) {
    this.commonStaffUserService.getUserDetails(id,'admin').subscribe({
      next: (res: any) => {
        const userData = res.data;
        const roleValue = Array.isArray(userData.role) ? userData.role[0] : userData.role;

        if (roleValue === 'manager' && userData.state) {
          this.updateZoneOptions(userData.state);
          this.updateDistrictOptions(userData.zones);
        this.addForm.patchValue({
          name: userData.name,
          phone: userData.phone,
          email: userData.email,
            role: roleValue,
          isDeleted: userData.isDeleted,
          state: userData.state,
          zones: userData.zones,
          districts: userData.districts
        });
        } else {
          // For admin or other roles, clear state/zones/districts
          this.addForm.patchValue({
            name: userData.name,
            phone: userData.phone,
            email: userData.email,
            role: roleValue,
            isDeleted: userData.isDeleted,
            state: null,
            zones: [],
            districts: []
          });
        }
      },
      error: (err) => {
        console.error(err);
        this.utilityService.handleError(err);
      }
    });
  }

  get isActive(): boolean {
    return !this.addForm.get('isDeleted')?.value;
  }
  set isActive(val: boolean) {
    this.addForm.get('isDeleted')?.setValue(!val);
  }

}
