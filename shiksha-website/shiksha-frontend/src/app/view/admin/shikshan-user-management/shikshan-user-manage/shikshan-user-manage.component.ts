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
      if (this.userId) {
        this.getUserDetails(this.userId);
      }
    });

    this.initialize_add_form();
  }

  initialize_add_form() {
    this.addForm = this.fb.group({
      name: [null, [Validators.required,Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.minLength(10), Validators.pattern(this.utilityService.regexPattern.phoneRegex)]],
      email: [null, [Validators.required, Validators.email]],
      role: [null, [Validators.required]],
      isDeleted: [false, [Validators.required]]
    });
    this.patchStatus();
  }

  on_form_submit() {
    this.submitted = true;
    if (this.addForm.invalid) {
      return;
    }
    if (this.mode === 'edit') {
        this.addForm.value.isDeleted = !this.addForm.value.isDeleted; 

        this.shikshanaUserService.editUserDetails(this.userId, this.addForm.value).subscribe({
          next: (res: any) => {
            this.router.navigate(['/admin/shikshana-user/list']);
            this.utilityService.handleResponse(res);
          },
          error: (err) => {
            console.error(err);
            this.utilityService.handleError(err);
          }
        });
      }
      else {
        this.addForm.value.isDeleted = !this.addForm.value.isDeleted; // Toggle isDeleted for edit mode

        this.commonStaffUserService.addUser(this.addForm.value,'admin').subscribe({
          next: (res: any) => {
            this.router.navigate(['/admin/shikshana-user/list']);
            this.utilityService.handleResponse(res)
          },
          error: (err) => {
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

        // Patch the values to the form
        this.addForm.patchValue({
          name: userData.name,
          phone: userData.phone,
          email: userData.email,
          role: userData.role[0],
          isDeleted: userData.isDeleted
        });
        this.patchStatus();
      },
      error: (err) => {
        console.error(err);
        this.utilityService.handleError(err);
      }
    });
  }


}
