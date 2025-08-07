import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, Subject, debounceTime, distinctUntilChanged, Observable } from 'rxjs';
import { UtilityService } from 'src/app/core/services/utility.service';
import { UserManagementService } from 'src/app/view/admin/user-management/user-management.service';
import { DropDownConfig } from '../../interfaces/dropdown.interface';
import { StaffUserCommonService } from '../../services/staff-user-common.service';
import { BULK_UPLOAD_FILE_TYPES } from '../../utility/constant.util';
import { ModalService } from '../modal/modal.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {TranslateModule } from '@ngx-translate/core';
import { CommonDropdownComponent } from '../common-dropdown/common-dropdown.component';
import { ModalComponent } from '../modal/modal.component';
import { DisablePopupComponent } from '../disable-popup/disable-popup.component';
import { UploadPopupComponent } from '../upload-popup/upload-popup.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { HasPermissionDirective } from 'src/app/core/directives/has-permission.directive';
import { UploadErrorPopupComponent } from '../upload-error-popup/upload-error-popup.component';
import { MasterService } from '../../services/master.service';
import { SchoolManagementService } from 'src/app/view/admin/school-management/school-management.service';
import { SchoolList } from '../../interfaces/school-list.interface';
import { slideInOutAnimation } from '../../utility/animations.util';

interface ContentListConfig {
  [key: string]:
  {type:string, router: string, table_headers: any,download_file:string };
}

@Component({
  selector: 'app-user-staff-list',
  templateUrl: './user-staff-list.component.html',
  styleUrls: ['./user-staff-list.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, CommonDropdownComponent,ModalComponent,DisablePopupComponent,UploadPopupComponent,PaginationComponent,TranslateModule, NgSelectModule,HasPermissionDirective, UploadErrorPopupComponent],
  animations:[slideInOutAnimation]
  
})
export class UserStaffListComponent implements OnInit,AfterViewInit{

  @ViewChild('dropdownContent') dropdownContent !: ElementRef;
  dropdownSubscription!: Subscription;
  
  schoolNamesDropdownOptions: any[]=[];

  userRolesDropdownOptions!: any[];

  userStatusDropdownOptions: any[]=[{ name: 'Active', value: 'active' },{ name: 'Inactive', value: 'inactive' }];

  districtDropdownOptions: any[] = [];

  stateDropdownOptions: any[] = [];

  blockDropdownOptions: any[] = [];

  zoneDropdownOptions: any[] = [];

  schoolDropdownOptions: any[] = [];


  schoolNamesDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'School Name',
    height: 'auto',
    bindLabel:'name',
    bindValue:'_id',
    labelTxt:"School Name",
    searchable: true
  };

  userRolesDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Type of Teacher',
    height: 'auto',
    bindLabel:'name',
    bindValue:'value',
    labelTxt:'Type of Teacher'
  };

  userStatusDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Status of user',
    height: 'auto',
    bindLabel:'name',
    bindValue:'value',
    labelTxt:'Status of user'
  };

  stateDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'State',
    height: 'auto',
    bindLabel: 'state',
    bindValue: 'state',
    labelTxt: 'State'
  };

  districtDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'District',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'name',
    labelTxt: 'District'
  };

  blockDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Taluk',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'name',
    labelTxt: 'Taluk'
  };

  zoneDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Zone',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'name',
    labelTxt: 'Zone'
  };

  schoolDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'School',
    height: 'auto',
    bindLabel: 'name',
    bindValue: '_id',
    labelTxt: 'School',
    searchable: true
  };


  schoolId: any;

  tableData: any;

  modal_subheader = 'Are you sure you want to delete this Teacher? This cannot be undone.';

  showAdditionalFilters = false

  isEditing: boolean = false;
  userId!: string;
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;
  usersList!: any[];
  usersListWithoutPg!:any[];
  isOpen: boolean[] = [];
  searchText: any = "";
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  selectedUser: any;
  private searchTerms = new Subject<string>();
  selectedRole!: string;
  selectedSchool!: string;
  uploadFileTypes = BULK_UPLOAD_FILE_TYPES;
  fileToUpload!: File;
  lessonContentType!: string | null;
  contentListConfig:ContentListConfig = {
    "/admin/user-management/list": {
      type:'user',
      router: '/admin/user-management/',
      table_headers: ['Teacher Name', 'Mobile Number', 'School Name', 'Type of Teacher', 'Status of Teacher', ''],
      download_file:'user-management'

    },
    "/admin/shikshana-user/list": {
      type:"admin",
      router: '/admin/shikshana-user/',
      table_headers: ['Staff Name', 'Mobile Number', 'Type of staff', 'Status of staff', ''],
      download_file:'admin-shikshana-user-management'
    }
  }

  errorUrl:any;
  includeDeleted:number = 1;

  private searchSubscription!: Subscription;

  private paginationSubscription!: Subscription;

  private nonPaginationSubscription!: Subscription;

  regionsData: any;

  selectedStateObj: any;

  selectedZoneObj: any;

  selectedDistrictObj: any;

  filterObj: any = {
    district: '',
    zone: '',
    block: '',
    school: '',
    search: '',
    includeDeleted:''
  };

  schoolListData!: [SchoolList];

  @ViewChild('zoneDropdown') zoneDropdown: any;
  @ViewChild('districtDropdown') districtDropdown: any;
  @ViewChild('blockDropdown') blockDropdown: any;
  @ViewChild('schoolDropdown') schoolDropdown: any;


  constructor(private elRef:ElementRef, private route: ActivatedRoute, private router: Router, public modalService: ModalService, private userManagementService: UserManagementService, public utility: UtilityService, private commonStaffUserService: StaffUserCommonService, private masterService:MasterService, private schoolManagementService:SchoolManagementService) {
    this.lessonContentType = this.router.url.split('?')[0];
    if (this.getType()?.type === 'user') {
      this.userRolesDropdownOptions = [{ name: 'Standard', value: 'standard' }, { name: 'Power', value: 'power' }];
    } 
    if (this.getType()?.type === 'admin') {
      this.userRolesDropdownOptions = [{ name: 'Admin', value: 'admin' }, { name: 'Manager', value: 'manager' }];
      this.userRolesDropdownconfig.placeHolderTxt ='Type of staff'
      this.modal_subheader = 'Are you sure you want to delete this Staff? This cannot be undone.';
    }
    
  }

  ngOnInit(): void {  
    this.onFilterChange('includeDeleted', this.includeDeleted)

    if(this.getType()?.type === 'user'){
      this.getRegionsData();
    }  
    this.searchSubscription = this.searchTerms.pipe(
      debounceTime(1000),
      distinctUntilChanged()
    ).subscribe(() => {
      this.onFilterChange('search', this.searchText);
    });
    this.updateDropdownConfig(this.getType()?.type);
  }

    /**
   * Function to get regions data
   */
    getRegionsData() {
      this.masterService.getRegions().subscribe({
        next: (val) => {
          this.regionsData = val?.data?.results;
          this.stateDropdownOptions = this.regionsData;
        },
      });
    }

  updateDropdownConfig(type: any): void {
    if (type === 'user') {
      this.userRolesDropdownconfig.placeHolderTxt = 'Type of Teacher';
      this.userRolesDropdownconfig.labelTxt = 'Type of Teacher';
      this.userStatusDropdownconfig.placeHolderTxt = 'Status of Teacher';
      this.userStatusDropdownconfig.labelTxt = 'Status of Teacher';
    } else if (type === 'admin') {
      this.userRolesDropdownconfig.placeHolderTxt = 'Type of Staff';
      this.userRolesDropdownconfig.labelTxt = 'Type of Staff';
      this.userStatusDropdownconfig.placeHolderTxt = 'Status of Staff';
      this.userStatusDropdownconfig.labelTxt = 'Status of Staff';
    }
  }
  

  ngAfterViewInit(): void {
    if(this.getType()?.type === 'user'){
      this.schoolDropdown.selectedItem = this.schoolId
    }
  }

  /**
   * provide the id of the logged user
   * @returns 
   */
  loggedUser(){
    return this.utility.loggedInUserData._id;
  }

  toggleDropdown(i: any, e: Event) {
    e.stopPropagation();
    this.utility.resetArrayIfTrueInBetween(this.isOpen,i)
    this.isOpen[i] = !this.isOpen[i];
  }

  @HostListener('click', ['$event'])
  clickInside(event : MouseEvent){
    if((event.target as HTMLElement).closest('.table-section')){
      this.isOpen = [];
    }
  }

  viewUser(item: any) {
    this.router.navigate([`${this.getType()?.router}/${item._id}`], {
      queryParams: { mode: 'view' },
    });
  }

  editUser(item: any) {
    this.router.navigate([`${this.getType()?.router}/${item._id}`], {
      queryParams: { mode: 'edit' },
    });
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  openAddUserFormComp() {

    this.router.navigate([`${this.getType()?.router}/add`]);
  }

  openModalForDeleteConfirm(item: any) {
    this.modalService.showDeleteUserDialog = true;
    this.tableData = {
      id: item._id,
      header:this.getType()?.type === 'user' ? ['Teacher Name', 'Role Name', 'Status of Teacher'] : ['Staff Name', 'Role Name', 'Status of staff'],
      data: {
        status: item.isDeleted ? 'Inactive' : 'Active',
        isAction: true,
        user_name: item.name,
        role_name: item.role,
        more_icon: false
      }
    }
  }

  ondisableUser(item: any) {    
    this.commonStaffUserService.disableUser(item.id,this.getType()?.type).subscribe({
      next: (res: any) => {
        this.modalService.showDeleteUserDialog = false;
        this.utility.handleResponse(res);
        this.getUsersList();
      },
      error: (err) => {
        console.error(err);
        this.utility.handleError(err);
      }
    });
  }

  searchInputChanged(event: any): void {   
    this.searchTerms.next(event.target.value);
    this.currentPage = 1;
  }
  
  onRoleChange(role:any){
    this.selectedRole = role;
    this.currentPage=1;
    this.getUsersList();
  }

  onStatusChange(status: any): void {
    this.currentPage = 1;
    if (status) {
      if (status === 'active') {
        this.includeDeleted = 0; 
      } else if (status === 'inactive') {
        this.includeDeleted = 2;  
      }
    } else {
      this.includeDeleted = 1;    
    }
    this.onFilterChange('includeDeleted', this.includeDeleted)
  }
  
  toggleFilter(){
    console.log(this.filterObj);
    
    if(this.showAdditionalFilters && this.filterObj?.state){
      this.onFilterChange('state',null)
    }
    this.showAdditionalFilters = !this.showAdditionalFilters;
  }
  
  getUsersList(filter?:any): void {
    let observable: Observable<any>;

    if (filter) {
      observable = this.commonStaffUserService.getUsers(
        this.getType()?.type,
        this.currentPage,
        this.pageSize,
        filter
      );
    } else {
      observable = this.commonStaffUserService.getUsers(
        this.getType()?.type,
        this.currentPage,
        this.pageSize
      );
    }

    if(this.paginationSubscription){
      this.paginationSubscription.unsubscribe();
    }
  
    this.paginationSubscription = observable.subscribe({
      next: (res: any) => {
        this.usersList = res.data['results'];
        this.totalItems = res.data.totalItems;
      },
      error: (err) => {
        console.error('Error while fetching list', err);
      }
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
    if (isUpload && this.fileToUpload) {
      const formData = new FormData();
      formData.append('file', this.fileToUpload);

      this.commonStaffUserService.bulkUpload(formData,this.getType()?.type).subscribe({
        next: (res:any)=>{
          this.utility.showSuccess(res.message);
          this.modalService.showBlukUploadDialog = false;
        },
        error: (err)=>{
          if(err?.error?.errorUrl){
            this.errorUrl = err?.error?.errorUrl;
            this.modalService.showBlukUploadDialog = false;
            this.modalService.showUploadErrorDialog = true;
            }else{
            this.utility.showError(err.error.message);
            }
        }
      });
    }
  }

/**
   * pagination
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.getUsersList(this.filterObj);
  }

  getPageNumbers(): number[] {
    return this.utility.getPageNumbers(this.totalItems, this.pageSize);
  }

  getType() {
    if (this.lessonContentType) {
      return this.contentListConfig[this.lessonContentType];
    } else {
      return null;
    }
  }

  activateUser(id:any){
    this.commonStaffUserService.activateUser(id, this.getType()?.type).subscribe({
      next:(res:any)=>{
        this.utility.handleResponse(res);
        this.getUsersList();
      },
      error:(err)=>{
        this.utility.handleError(err);
      }
    });
  }

  exportUsersListToExcel(){
    if(!this.usersList.length){
      return
    }
    this.commonStaffUserService.exportTeacher(this.filterObj).
    subscribe({
      next:(res) => {
       this.utility.handleResponse(res)        
      },
      error:(err)=>{
        this.utility.handleError(err)
      }
    })

    
  }

 
  
  toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  onFilterChange(type: any, value: any) {
    this.filterObj[type] = value;
    if (value) {
      switch (type) {
        case 'state': this.setZoneDropdownValues(value);
          break;
        case 'zone': this.setDistrictDropdownValues(value);
          break;
        case 'district': this.setBlockDropdownValues(value);
          break;
        case 'block': this.getSchoolFilteredList();
        break; 
      }
    }
    else {
      switch (type) {
        case 'state': this.resetStates();
          break;
        case 'zone': this.resetZone();
          break;
        case 'district': this.resetDistrict();
          break;
        case 'block': this.resetBlock();
          break;
        
      }
    }
    this.currentPage = 1;
    this.getUsersList(this.filterObj)
  }


        /**
       * Function to get filtered school list
       */
        getSchoolFilteredList() {
          this.resetBlock();
          const filters = {
            state:this.filterObj.state,
            district:this.filterObj.district,
            zone:this.filterObj.zone,
            block:this.filterObj.block
          }
          this.userManagementService.getSchoolList(true,filters).subscribe((res: any) => {
            this.schoolDropdownOptions = res?.data?.results
          });
      }


  resetStates() {
    this.zoneDropdownOptions = [];
        this.districtDropdownOptions = [];
        this.blockDropdownOptions = [];
        this.schoolDropdownOptions = [];
        this.filterObj.zone = '';
        this.filterObj.district = '';
        this.filterObj.block = '';
        this.filterObj.school = ''
        this.zoneDropdown.selectedItem = null;
        this.districtDropdown.selectedItem = null;
        this.blockDropdown.selectedItem = null;
        this.schoolDropdown.selectedItem = null;
  }

  resetZone() {
    this.filterObj.district = '';
        this.filterObj.block = '';
        this.filterObj.school = '';
        this.districtDropdownOptions = [];
        this.blockDropdownOptions = [];
        this.schoolDropdownOptions = [];
        this.districtDropdown.selectedItem = null;
        this.blockDropdown.selectedItem = null;
        this.schoolDropdown.selectedItem = null;
  }

  resetDistrict() {
    this.filterObj.block = '';
    this.filterObj.school = '';
        this.blockDropdownOptions = [];
        this.schoolDropdownOptions = [];
        this.blockDropdown.selectedItem = null;
        this.schoolDropdown.selectedItem = null;
  }

  resetBlock() {
    this.filterObj.school = '';
        this.schoolDropdownOptions = [];
        this.schoolDropdown.selectedItem = null;
  }

  /**
   * Function to get school list data
   */
  getShcoolList(filter?: any): void {
    let observable: Observable<any>;

    if (filter) {
      observable = this.schoolManagementService.getSchoolList(
        this.currentPage,
        this.pageSize,
        filter
      );
    } else {
      observable = this.schoolManagementService.getSchoolList(
        this.currentPage,
        this.pageSize
      );
    }


    if(this.paginationSubscription){
      this.paginationSubscription.unsubscribe();
    }

    this.paginationSubscription = observable.subscribe({
      next: (res: any) => {
        this.schoolListData = res.data['results'];
        this.totalItems = res.data.totalItems;
        if(this.totalItems <= 10){
          this.currentPage = 1;
        }
      },
      error: (err) => {
        console.error('Error while fetching list', err);
      },
    });
  }


    /**
   * Function to set zone dropdown values
   * @param selectedStateValue
   */
    setZoneDropdownValues(selectedStateValue: any) {
      if (selectedStateValue) {
        this.selectedStateObj = this.utility.filterDropdownValues(
          this.regionsData,
          'state',
          selectedStateValue
        );
        this.zoneDropdownOptions = this.selectedStateObj.zones;
      }
    }
  
    /**
     * Function to set district dropdown values
     * @param selectedZone
     */
    setDistrictDropdownValues(selectedZone: any) {
      this.resetZone()
      if (selectedZone) {
        this.selectedZoneObj = this.utility.filterDropdownValues(
          this.selectedStateObj.zones,
          'name',
          selectedZone
        );
        this.districtDropdownOptions = this.selectedZoneObj.districts;
      }
    }
  
    /**
     * Function to set block dropdown values
     * @param selectedDistrict
     */
    setBlockDropdownValues(selectedDistrict: any) {
      this.resetDistrict()
      if (selectedDistrict) {
        this.selectedDistrictObj = this.utility.filterDropdownValues(
          this.selectedZoneObj.districts,
          'name',
          selectedDistrict
        );
        this.blockDropdownOptions = this.selectedDistrictObj.blocks;
      }
    }

  
  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }

    if(this.paginationSubscription){
      this.paginationSubscription.unsubscribe();
    }

    if(this.nonPaginationSubscription){
      this.nonPaginationSubscription.unsubscribe()
    }
  }

}
