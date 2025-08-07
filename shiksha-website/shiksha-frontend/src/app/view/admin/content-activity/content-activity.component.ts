import { Component, OnInit, ViewChild } from '@angular/core';
import { UtilityService } from 'src/app/core/services/utility.service';
import { DropDownConfig } from 'src/app/shared/interfaces/dropdown.interface';
import { MasterService } from 'src/app/shared/services/master.service';
import { UserManagementService } from '../user-management/user-management.service';
import { Observable, Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ContentActivityService } from './content-activity.service';

@Component({
  selector: 'app-content-activity',
  templateUrl: './content-activity.component.html',
  styleUrls: ['./content-activity.component.scss']
})
export class ContentActivityComponent implements OnInit {

  searchText: any = "";
  currentPage = 1;
  totalItems = 0;
  pageSize = 10;
  listData:any[]=[];
  private searchTerms = new Subject<string>();
  table_headers = ['Teacher Name', 'Content Regenerated', 'Original Content','Status', 'Date of Modification'];

  stateDropdownOptions: any[] = [];
  stateDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select State',
    height: 'auto',
    bindLabel: 'state',
    bindValue: 'state',
    clearableOff: false,
    labelTxt: 'State'
  };

  zoneDropdownOptions: any[] = [];
  zoneDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Zone',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'name',
    clearableOff: false,
    labelTxt: 'Zone'
  };

  districtDropdownOptions: any[] = [];
  districtDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select District',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'name',
    clearableOff: false,
    labelTxt: 'District'
  };

  blockDropdownOptions: any[] = [];
  blockDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select Taluk',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'name',
    clearableOff: false,
    labelTxt: 'Taluk'
  };

  schoolDropdownOptions: any[] = [];
  schoolDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select School',
    height: 'auto',
    bindLabel: 'name',
    bindValue: '_id',
    clearableOff: false,
    labelTxt: 'School',
    searchable: true
  };

  @ViewChild('stateDropdown') stateDropdown: any;
  @ViewChild('zoneDropdown') zoneDropdown: any;
  @ViewChild('districtDropdown') districtDropdown: any;
  @ViewChild('blockDropdown') blockDropdown: any;
  @ViewChild('schoolDropdown') schoolDropdown: any;

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

  selectedSchoolId: any;

  private searchSubscription!: Subscription;

  private paginationSubscription!: Subscription;


  constructor(private contentActivityService: ContentActivityService, private masterService: MasterService, private utilityService: UtilityService, private userManagementService: UserManagementService) { }

  ngOnInit(): void {
    this.getRegionsData();

    this.searchSubscription = this.searchTerms
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe(() => {
        this.onFilterChange('search', this.searchText);
      });
    this.getContentActivityData();

  }

  getContentActivityData(filters?: any) {
    let observable: Observable<any>;
      
    if (this.searchText.trim() !== '') {
      observable = this.contentActivityService.getContentActivityData(this.currentPage, this.pageSize, filters, this.searchText);
    } else {
      observable = this.contentActivityService.getContentActivityData(this.currentPage, this.pageSize, filters);
    }

    if(this.paginationSubscription){
      this.paginationSubscription.unsubscribe();
    }
  
    this.paginationSubscription = observable.subscribe({
      next: (res: any) => {
        this.listData = res.data['results'];
        this.totalItems = res.data.totalItems;
        if(this.totalItems <= 10){
          this.currentPage = 1;
        }
      },
      error: (err) => {
        this.utilityService.handleError(err);
      }
    });
  }

  searchInputChanged(event: any): void {
    this.searchTerms.next(event.target.value);
    this.currentPage = 1;
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
    this.getContentActivityData(this.filterObj);
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
      this.schoolDropdownOptions = res?.data?.results;
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
   * pagination
   */
  onPageChange(page: number): void {  
    this.currentPage = page;
    this.getContentActivityData(this.filterObj);
  }

  getPageNumbers(): number[] {
    return this.utilityService.getPageNumbers(this.totalItems, this.pageSize);
  }

  exportContentActivities(){
    if(!this.listData.length){
      return
    }
    this.contentActivityService.exportContentActivities(this.filterObj).
    subscribe({
      next:(res) => {
        this.utilityService.handleResponse(res)
      },
      error:(err)=>{
        this.utilityService.handleError(err)
      }
    })
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
