import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { SchoolList } from 'src/app/shared/interfaces/school-list.interface';
import { SchoolManagementService } from '../school-management.service';
import { Router } from '@angular/router';
import { DropDownConfig } from 'src/app/shared/interfaces/dropdown.interface';
import { ModalService } from 'src/app/shared/components/modal/modal.service';
import { UtilityService } from 'src/app/core/services/utility.service';
import { BULK_UPLOAD_FILE_TYPES } from 'src/app/shared/utility/constant.util';
import { Observable, Subject, Subscription, debounceTime, distinctUntilChanged} from 'rxjs';
import { MasterService } from 'src/app/shared/services/master.service';
import { UserManagementService } from '../../user-management/user-management.service';

@Component({
  selector: 'app-school-list',
  templateUrl: './school-list.component.html',
  styleUrls: ['./school-list.component.scss'],
})
export class SchoolListComponent implements OnInit, OnDestroy {
  schoolListData!: [SchoolList];
  users_of_school!: number;

  schoolListTableHeaders = [
    'DISE Code',
    'School Name',
    'District',
    'Taluk',
    'Zone',
    'Status',
    'Action',
  ];

  districtDropdownOptions: any[] = [];

  stateDropdownOptions: any[] = [];

  blockDropdownOptions: any[] = [];

  zoneDropdownOptions: any[] = [];

  schoolDropdownOptions: any[] = [];

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

  isOpen: boolean[] = [];

  uploadFileTypes = BULK_UPLOAD_FILE_TYPES;

  fileToUpload!: File;

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  searchText: any = '';
  private searchTerms = new Subject<string>();

  filterObj: any = {
    district: '',
    zone: '',
    block: '',
    _id: '',
    search: '',
  };

  regionsData: any;

  selectedStateObj: any;

  selectedZoneObj: any;

  selectedDistrictObj: any;

  states: any[] = [];

  valAssigned = false;

  tableData: any;

  errorUrl:any;

  private searchSubscription!: Subscription;

  private paginationSubscription!: Subscription;

  

  @ViewChild('zoneDropdown') zoneDropdown: any;
  @ViewChild('districtDropdown') districtDropdown: any;
  @ViewChild('blockDropdown') blockDropdown: any;
  @ViewChild('schoolDropdown') schoolDropdown: any;

  /**
   * Class constructor
   * @param schoolManagementService SchoolManagementService
   * @param router Router
   * @param modalService ModalService
   * @param utilityService UtilityService
   * @param masterService MasterService
   * @param userManagementService UserManagementService
   */
  constructor(
    private schoolManagementService: SchoolManagementService,
    private router: Router,
    public modalService: ModalService,
    private utilityService: UtilityService,
    private masterService: MasterService,
    private userManagementService:UserManagementService
  ) {}

  /**
   * OnInit lifecycle hook for initialization
   */
  ngOnInit(): void {
    this.getRegionsData();

    this.searchSubscription = this.searchTerms
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe(() => {
        this.onFilterChange('search', this.searchText);
      });
    this.getShcoolList();
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
    }
  }

  /**
   * Function to set district dropdown values
   * @param selectedZone
   */
  setDistrictDropdownValues(selectedZone: any) {
    this.resetZone()
    if (selectedZone) {
      this.selectedZoneObj = this.utilityService.filterDropdownValues(
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
      this.selectedDistrictObj = this.utilityService.filterDropdownValues(
        this.selectedZoneObj.districts,
        'name',
        selectedDistrict
      );
      this.blockDropdownOptions = this.selectedDistrictObj.blocks;
    }
  }

  /**
   * Function triggered on dropdown toggle
   * @param i index
   * @param e event
   */
  toggleDropdown(i: any, e: Event) {
    e.stopPropagation();
    this.utilityService.resetArrayIfTrueInBetween(this.isOpen,i)
    this.isOpen[i] = !this.isOpen[i];
  }

  @HostListener('click', ['$event'])
  clickInside(event : MouseEvent){
    if((event.target as HTMLElement).closest('.school-list-container')){
      this.isOpen = [];
    }
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
    this.getShcoolList(this.filterObj);
  }

  resetStates() {
    this.zoneDropdownOptions = [];
        this.districtDropdownOptions = [];
        this.blockDropdownOptions = [];
        this.schoolDropdownOptions = [];
        this.filterObj.zone = '';
        this.filterObj.district = '';
        this.filterObj.block = '';
        this.filterObj._id = ''
        this.zoneDropdown.selectedItem = null;
        this.districtDropdown.selectedItem = null;
        this.blockDropdown.selectedItem = null;
        this.schoolDropdown.selectedItem = null;
  }

  resetZone() {
    this.filterObj.district = '';
        this.filterObj.block = '';
        this.filterObj._id = '';
        this.districtDropdownOptions = [];
        this.blockDropdownOptions = [];
        this.schoolDropdownOptions = [];
        this.districtDropdown.selectedItem = null;
        this.blockDropdown.selectedItem = null;
        this.schoolDropdown.selectedItem = null;
  }

  resetDistrict() {
    this.filterObj.block = '';
    this.filterObj._id = '';
        this.blockDropdownOptions = [];
        this.schoolDropdownOptions = [];
        this.blockDropdown.selectedItem = null;
        this.schoolDropdown.selectedItem = null;
  }

  resetBlock() {
    this.filterObj._id = '';
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
   * Function to set dropdown value
   */
  setDropdown() {
    this.isOpen = [];
    this.schoolListData.forEach(() => {
      this.isOpen.push(false);
    });
  }

  /**
   * Function to navigate to view school details
   * @param id school id
   */
  viewSchool(id: any) {
    this.router.navigate([`/admin/school-management/${id}`], {
      queryParams: { mode: 'view' },
    });
  }

  /**
   * Function to navigate to edit school details
   * @param id school id
   */
  editSchool(id: any) {
    this.router.navigate([`/admin/school-management/${id}`], {
      queryParams: { mode: 'edit' },
    });
  }

  /**
   * Function to open disable school popup
   */
  openModalForDeleteConfirm(item: any) {
    this.users_of_school = 0;
    this.userManagementService.getUsersOfSchool(item._id).subscribe({
      next:(res:any)=>{
        this.users_of_school = res.data.totalItems;
      }
    });
    this.modalService.showDeleteUserDialog = true;
    this.tableData = {
      id: item._id,
      header: ['School Name', 'School ID', 'District', 'Zone'],
      data: {
        school_name: item.name,
        school_id: item.schoolId || '-',
        district: item.district,
        zone: item.zone,
      },
    };

  }

  /**
   * Function to open bulk upload popup
   */
  blukUpload() {
    this.modalService.showBlukUploadDialog = true;
  }

  exportSchoolList(){
    if(!this.schoolListData.length){
      return
    }
    this.schoolManagementService.exportSchoolList(this.filterObj).
    subscribe({
      next:(res) => {
        this.utilityService.handleResponse(res)
      },
      error:(err)=>{
        this.utilityService.handleError(err)
      }
    })
  }

  searchInputChanged(event: any): void {
    this.searchTerms.next(event.target.value);
    this.currentPage = 1;
  }

  onDisableSchool(item: any) {
    this.schoolManagementService.disableSchool(item.id).subscribe({
      next: (res: any) => {
        this.modalService.showDeleteUserDialog = false;
        this.utilityService.handleResponse(res);
        this.getShcoolList();
      },
      error: (err) => {
        this.utilityService.handleError(err);
      },
    });
  }

  /**
   * pagination
   */
  onPageChange(page: number): void {  
    this.currentPage = page;
    this.getShcoolList(this.filterObj);
  }

  getPageNumbers(): number[] {
    return this.utilityService.getPageNumbers(this.totalItems, this.pageSize);
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
    
          this.schoolManagementService.bulkUpload(formData).subscribe({
            next: (res:any)=>{
              this.utilityService.showSuccess(res.message);
              this.modalService.showBlukUploadDialog = false;
            },
            error: (err)=>{
              if(err?.error?.errorUrl){
              this.errorUrl = err?.error?.errorUrl;
              this.modalService.showBlukUploadDialog = false;
              this.modalService.showUploadErrorDialog = true;
              }else{
              this.utilityService.showError(err.error.message);
              }
            }
          });
        }
      }

      activateSchool(id:any){
        this.schoolManagementService.activateSchool(id).subscribe({
          next:(res:any)=>{
            this.utilityService.handleResponse(res);
            this.getShcoolList();
          },
          error:(err)=>{
            this.utilityService.handleError(err);
          }
        });
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

    ngOnDestroy(): void {
      if (this.searchSubscription) {
        this.searchSubscription.unsubscribe();
      }
      if(this.paginationSubscription){
        this.paginationSubscription.unsubscribe();
      }
    }
}
