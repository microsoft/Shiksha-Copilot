import { AfterViewInit, ChangeDetectorRef, Component, OnInit, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DropDownConfig } from 'src/app/shared/interfaces/dropdown.interface';
import { NgChartsModule } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { CommonDropdownComponent } from 'src/app/shared/components/common-dropdown/common-dropdown.component';
import { MasterService } from 'src/app/shared/services/master.service';
import { UtilityService } from 'src/app/core/services/utility.service';
import { UserManagementService } from '../user-management/user-management.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { Router } from '@angular/router';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { FormsModule } from '@angular/forms';
const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

interface DashboardFilters {
  state?: string;
  zone?: string;
  district?: string;
  block?: string;
  schoolId?: string;
  fromDate?: string;
  toDate?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule, NgChartsModule, CommonDropdownComponent, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  tableHeaders = ['User Name', 'Type of User', 'Status'];
  stateDropdownOptions: any[] = [];
  stateDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select State',
    height: 'auto',
    bindLabel: 'state',
    bindValue: 'state',
    clearableOff: true,
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

  planTypeDropdownOptions: any[] = [{ name: 'Lesson Plan', value: 'lesson' }, { name: 'Resource Plan', value: 'resource' }];
  planTypeDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Plan Type',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'value',
    labelTxt: 'Plan Type',
    clearableOff :true,
  };

  regionsData: any;

  selectedStateObj: any;

  selectedZoneObj: any;

  selectedDistrictObj: any;

  selectedState: any;

  selectedZone: any;

  selectedDistrict: any;

  selectedBlock: any;

  selectedSchoolId: any;
  selectedSchoolName:any;
  selectedFromDate:any;
  selectedToDate:any;
  schools: any;
  allUsersList: any[] = [];
  filteredUsersList: any[] = [];
  allUsersCount: number = 0;
  activeUsersCount: number = 0;
  inactiveUsersCount: number = 0;
  userMediumMetrics: any[] = [];
  selectedMedium: string = 'all';
  userDataAvailable: boolean = false;
  subDataAvailable: boolean = false;
  mediumDataAvailable: boolean = false;
  statusDataAvailable: boolean = false;
  avgScoreDataAvailable: boolean = false;
  chatbotDataAvailable: boolean = false;
  selectedPlanType: string = 'lesson'; 
  isLesson:boolean = true;

  @ViewChild('stateDropDown') statedropdown: any;
  @ViewChild('zoneDropDown') zonedropdown: any;
  @ViewChild('districtDropDown') districtdropdown: any;
  @ViewChild('blockDropDown') blockdropdown: any;
  @ViewChild('schoolDropDown') schooldropdown: any;
  @ViewChild('planTypeDropDown') plantypedropdown:any;

  // by user bar chart
  byUserBarChartLegend = false;
  
  byUserBarChartPlugins = []; 

  byUserBarChartData!: ChartConfiguration<'bar'>['data'];  

  byUserBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio:false,
    scales: {
      x: {
        grid: {
          display: false,
          lineWidth: 1,
        }
      },
      y: {
        beginAtZero:true,
        ticks:{
          display:true
        },
        grid:{
          color:'#DEE1E6'
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          usePointStyle: true
        },
      },
      tooltip:{
        backgroundColor:'#000000',
        titleMarginBottom: 0,
      }
    }  
  };

  // by subject bar chart
  bySubjectBarChartLegend = false;
  bySubjectBarChartPlugins = [];

  bySubjectBarChartData!: ChartConfiguration<'bar'>['data'];

  bySubjectBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio:false,
    scales: {
      x: {
        grid: {
          display: false,
          lineWidth:1
        },
      },
      y: {
        beginAtZero:true,
        ticks:{
          display:true
        },
        grid:{
          color:'#DEE1E6'
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          usePointStyle: true
        }
      },
      tooltip:{
        backgroundColor:'#000000'
      }
    }
  };

  // by medium donut chart
  byMediumDonutChartLegend = true;
  byMediumDonutChartPlugins = [];

  byMediumDonutChartData!: ChartData<'doughnut'>;

  byMediumDonutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
        }
      },
      tooltip:{
        backgroundColor:'#000000'
      }
    },
    cutout: '70%',
    scales: {
      x: {
        display: false
      },
      y: {
        display: false
      },
    }
  };

  //status
  statusDonutChartLegend = true;
  statusDonutChartPlugins = [];  

  statusDonutChartData!: ChartData<'doughnut'>;

  statusDonutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    rotation: -90,
    circumference: 180,
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          generateLabels: (chart): any[] => {
            const data = chart.data;
            const dataset = data.datasets[0];
            const activeUsersCount = dataset.data[0];  // Assuming the first index corresponds to active users
            const inactiveUsersCount = dataset.data[1]; // Assuming the second index corresponds to inactive users
  
            // Define your custom images
            const activeUserImage = new Image(20, 20);
            activeUserImage.src = '../../../../assets/icons/Profile_1.svg';
  
            const inactiveUserImage = new Image(20, 20);
            inactiveUserImage.src = '../../../../assets/icons/Profile_2.svg';
  
            // Return the custom labels with user counts
            return data.labels!.map((label, index): any => {
              const userCount = index === 0 ? activeUsersCount : inactiveUsersCount;
              return {
                text: `${label as string} (${userCount})`, // Add the user count next to the label
                hidden: isNaN(dataset.data[index] as number) || dataset.data[index] === null,
                lineCap: 'butt',
                lineDash: [],
                lineDashOffset: 0,
                lineJoin: 'miter',
                pointStyle: index === 0 ? activeUserImage : inactiveUserImage,
                datasetIndex: 0,
              };
            });
          },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 1)',
        xAlign: 'center',
      },
    },
    cutout: '70%',
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
  };
  

  // Average feedback score donut chart
  avgFeedbackDonutChartLegend = true;
  avgFeedbackDonutChartPlugins = [];

  avgFeedbackDonutChartData!: ChartData<'doughnut'>;

  avgFeedbackDonutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
        }
      },
      tooltip:{
        backgroundColor:'#000000'
      }
    },
    cutout: '70%',
    scales: {
      x: {
        display: false
      },
      y: {
        display: false
      },
    }
  };

  // chatbot requests bar chart
  chatbotRequestsBarChartLegend = true;
  chatbotRequestsBarChartPlugins = [];

  chatbotRequestsBarChartData!: ChartConfiguration<'bar'>['data'];

  chatbotRequestsBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y:{
        beginAtZero:true,
        grid:{
          color:'#DEE1E6'
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          usePointStyle: true
        }
      },
      tooltip:{
        backgroundColor:'#000000'
      }
    }
  };

  constructor(private renderer: Renderer2, private masterService: MasterService, private route: Router, private cdr: ChangeDetectorRef, private utilityService: UtilityService, private userManagementService: UserManagementService, private adminDashboardService: AdminDashboardService) { }

  ngOnInit(): void {
    this.getRegionsData();
  }

  ngAfterViewInit() {
    this.plantypedropdown.selectedItem = this.planTypeDropdownOptions[0].value;
  }  

  getRegionsData() {
    this.masterService.getRegions().subscribe({
      next: (val) => {

        this.regionsData = val?.data?.results;

        this.setStateDropdownValues(this.regionsData);
        this.statedropdown.selectedItem = this.regionsData[0].state;
        this.onStateChange(this.statedropdown.selectedItem);
      }
    });
  }

  setStateDropdownValues(val: any) {
    this.stateDropdownOptions = [
      { state: 'Overall'}, 
      ...val  
    ];
  }
  
  onStateChange(val: any) {
    if (val && val === 'Overall') {
      this.selectedState = null;
      this.resetStateChange();
      this.triggerGetDetails(this.isLesson);
      this.resetData();
    } else {
      this.selectedState = val;
      this.resetStateChange();
  
      if (val) {
        this.setZoneDropdownValues(val);
      } else {
        this.statedropdown.selectedItem = 'Overall';
        this.triggerGetDetails(this.isLesson);
        this.resetData();
      }
    }
  }
  
  resetStateChange() {    
    this.zoneDropdownOptions = [];
    this.zonedropdown.selectedItem = null;
    this.selectedZone = null;
    this.districtDropdownOptions = [];
    this.districtdropdown.selectedItem = null;
    this.selectedDistrict = null;
    this.blockDropdownOptions = [];
    this.blockdropdown.selectedItem = null;
    this.selectedBlock = null;
    this.schoolDropdownOptions = [];
    this.schooldropdown.selectedItem = null;
    this.selectedSchoolId = null;
    this.selectedFromDate = null;
    this.selectedToDate = null;
  }

  setZoneDropdownValues(selectedStateValue: any) {
    if (selectedStateValue) {
      this.selectedStateObj = this.utilityService.filterDropdownValues(
        this.regionsData,
        'state',
        selectedStateValue
      );

      this.zoneDropdownOptions = this.selectedStateObj.zones;
      this.onZoneChange(this.zonedropdown.selectedItem);
    }
  }

  onZoneChange(val: any) {
    this.selectedZone = val;
    this.resetZoneChange();
    if (val) {
      this.setDistrictDropdownValues(val);
    }
    else{
      this.resetZoneChange();
      this.triggerGetDetails(this.isLesson);
      this.resetData();
    }
  }

  resetZoneChange() {
    this.selectedDistrict = null;
    this.districtDropdownOptions = [];
    this.districtdropdown.selectedItem = null;
    this.selectedBlock = null;
    this.blockDropdownOptions = [];
    this.blockdropdown.selectedItem = null;
    this.selectedSchoolId = null;
    this.schoolDropdownOptions = [];
    this.schooldropdown.selectedItem = null;
  }

  setDistrictDropdownValues(selectedZoneValue: any) {
    if (selectedZoneValue) {
      this.selectedZoneObj = this.utilityService.filterDropdownValues(
        this.selectedStateObj.zones,
        'name',
        selectedZoneValue
      );

      this.districtDropdownOptions = this.selectedZoneObj.districts;
      this.onDistrictChange(this.districtdropdown.selectedItem);
    }
  }

  onDistrictChange(val: any): void {
    this.selectedDistrict = val;
    this.resetDistrictChange();  
    if (val) {
      this.setBlockDropdownValues(val);
    } else {
      this.resetDistrictChange();
      this.triggerGetDetails(this.isLesson);
      this.resetData();
    }
  }  

  resetDistrictChange() {
    this.selectedBlock = null;
    this.blockDropdownOptions = [];
    this.blockdropdown.selectedItem = null;
    this.selectedSchoolId = null
    this.schoolDropdownOptions = [];
    this.schooldropdown.selectedItem = null;
  }

  setBlockDropdownValues(selectedDistrictValue: any) {
    if (selectedDistrictValue) {
      this.selectedDistrictObj = this.utilityService.filterDropdownValues(
        this.selectedZoneObj.districts,
        'name',
        selectedDistrictValue
      );
      this.blockDropdownOptions = this.selectedDistrictObj.blocks;
      this.onBlockChange(this.blockdropdown.selectedItem);
    }
  }

  onBlockChange(val: any) {
    this.selectedBlock = val;
    this.resetBlockChange();
  
    if (val) {
      const filters = {
        state: this.selectedState,
        district: this.selectedDistrict,
        zone: this.selectedZone,
        block: this.selectedBlock,
      };
  
      this.userManagementService.getSchoolList(true, filters).subscribe((res: any) => {
        this.schools = res.data['results'];
  
        // Check if there are any schools available for the selected block
        if (this.schools.length === 0) {
          this.resetData();
        } else {
          // Populate the school dropdown with available schools
          this.schoolDropdownOptions = this.schools.map((school: { _id: string, name: string }) => ({
            _id: school._id,
            name: school.name,
          }));
  
          // Automatically select the first school if options are available
          if (this.schoolDropdownOptions.length > 0) {
            this.onSchoolChange(this.schooldropdown.selectedItem);
          }
        }
      });
    } else {
      this.selectedSchoolId = null;
      this.schoolDropdownOptions = [];
      this.triggerGetDetails(this.isLesson);
      this.resetData();
    }
  }
  

  resetData(){
    this.userDataAvailable = false;
    this.subDataAvailable = false;
    this.mediumDataAvailable = false;
  }

  resetBlockChange() {
    this.schoolDropdownOptions = [];
    this.schooldropdown.selectedItem = null;
  }

  onSchoolChange(val: any): void {
    const selectedSchool = this.schoolDropdownOptions.find(school => school._id === val);
  
    if (selectedSchool) {
      this.selectedSchoolName = selectedSchool.name; // Set the selected school name based on the selected ID
    }
  
    this.selectedSchoolId = val;  
    this.triggerGetDetails(this.isLesson);  
    if (!val) {
      this.resetData();
    }
  }
  

  validateDateRange(): boolean {
    if (this.selectedFromDate && this.selectedToDate) {
      const fromDate = new Date(this.selectedFromDate);
      const toDate = new Date(this.selectedToDate);
  
      if (fromDate > toDate) {
        this.utilityService.showError('From Date should be earlier than or equal to To Date');
        return false;
      }
  
      if (toDate < fromDate) {
        this.utilityService.showError('To Date should be later than or equal to From Date');
        return false;
      }
    }
    return true;
  }
  
  triggerGetDetails(isLesson: boolean): void {
    const params = {
        state: this.selectedState,
        zone: this.selectedZone,
        district: this.selectedDistrict,
        block: this.selectedBlock,
        schoolId: this.selectedSchoolId,
        fromDate: this.selectedFromDate,
        toDate: this.selectedToDate
    };

    this.getDetails(isLesson, params);
  }

  
  onFrmDateSelection(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFromDate = input.value;

    if (this.selectedFromDate) {
        if (this.validateDateRange()) {
            this.triggerGetDetails(this.isLesson);
        }
    } else {
        this.selectedToDate = null; 
        this.triggerGetDetails(this.isLesson);
    }
  }
  
  clearFrmDate(): void {
    this.selectedFromDate = null;
    this.triggerGetDetails(this.isLesson);
  }

  clearToDate(): void {
    this.selectedToDate = null;
    this.triggerGetDetails(this.isLesson);
  }
  
  onToDateSelection(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedToDate = input.value;
  
    if (this.validateDateRange()) {
      this.triggerGetDetails(this.isLesson);
    }
    else {
      this.triggerGetDetails(this.isLesson);
    }
  }   

  onPlanTypeChange(selectedValue: any): void {
    this.selectedPlanType = selectedValue;
    this.isLesson = selectedValue === 'lesson';  
    this.triggerGetDetails(this.isLesson); 
}


  getSelectedLocationLevel(): string {
    if (this.selectedSchoolId) {
      return 'by User';
    } else if (this.selectedBlock) {
      return 'by School';
    } else if (this.selectedDistrict) {
      return 'by Block';
    } else if (this.selectedZone) {
      return 'by District';
    } else if (this.selectedState) {
      return 'by Zone';
    } else {
      return 'by State';
    }
  }  

  getDetails(isLesson: boolean, filtersOrSchoolId?: any) {
    let schoolId: string | undefined;
    let filters: DashboardFilters = {};

    // Determine if the argument is a schoolId or a filters object
    if (typeof filtersOrSchoolId === 'string') {
        schoolId = filtersOrSchoolId;
    } else if (typeof filtersOrSchoolId === 'object') {
        filters = filtersOrSchoolId;
    }

    // If a schoolId is provided, clear the filters; otherwise, populate the filters
    if (schoolId) {
        filters = {};
    } else {
        filters = {
            state: filters.state || this.selectedState,
            zone: filters.zone || this.selectedZone,
            district: this.selectedDistrict,
            block: this.selectedBlock,
            schoolId: this.selectedSchoolId,
            fromDate: this.selectedFromDate,
            toDate: this.selectedToDate
        };
    }

    // Call the service method with isLesson, schoolId, and filters
    this.adminDashboardService.getData(isLesson, schoolId, filters).subscribe({
        next: (res: any) => {
            const data = res.data || {};
            this.updateUserChartData(data);
            this.userDataAvailable = this.byUserBarChartData?.datasets?.length > 0 && this.byUserBarChartData.datasets.some(dataset => dataset.data.length > 0);
            this.updateSubjectChartData(data);
            this.subDataAvailable = this.bySubjectBarChartData?.datasets?.length > 0 && this.bySubjectBarChartData.datasets.some(dataset => dataset.data.length > 0);
            this.updateMediumDonutChartData(data);
            this.mediumDataAvailable = this.byMediumDonutChartData?.datasets?.length > 0 && this.byMediumDonutChartData.datasets.some(dataset => dataset.data && dataset.data.length > 0 && dataset.data.some(count => count > 0));
            this.updateStatusDonutChartData(data);
            this.updateAvgFbScoreDonutChartData(data);
            this.avgScoreDataAvailable = this.avgFeedbackDonutChartData?.datasets?.length > 0 && this.avgFeedbackDonutChartData.datasets.some(dataset => dataset.data && dataset.data.length > 0 && dataset.data.some(count => count > 0));
            this.updateChatbotRequestsChartData(data);
            this.chatbotDataAvailable = this.chatbotRequestsBarChartData?.datasets?.length > 0 && this.chatbotRequestsBarChartData.datasets.some(dataset => dataset.data.length > 0);
            this.allUsersList = data.userCounts.allUsers || [];
            this.userMediumMetrics = data.userMediums || [];
            this.filterUsers(this.allUsersList, this.userMediumMetrics, this.selectedMedium);
        },
        error: (err) => {
            this.utilityService.handleError(err);
        }
    });
}


  capitalizeFirstLetter(label: string): string {
    if (!label) return label;
    return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  }

  /**
   * Lesson plan by User bar chart   *
   */

  updateUserChartData(data: any): void {    
    const labels = this.extractUserLabels(data);
    const dataset = this.createUserDataset(data);

    this.byUserBarChartData = {
      labels: labels,
      datasets: [dataset]
    };    
  }

  extractUserLabels(data: any): string[] {
    const labels = data.lessonPlanCount.map((item: any) => item.name);
    return labels.map(this.capitalizeFirstLetter);
  }

  createUserDataset(data: any): any {
    const numberOfUsers = data.lessonPlanCount.length;
    return {
      data: data.lessonPlanCount.map((item: any) => item.lessonPlanCount),
      label: 'No. of Lesson Plans',
      backgroundColor: '#379AE6',
      hoverBackgroundColor:'#379AE6',
      borderColor:'#FFFFFF',
      categoryPercentage: 0.8,
      barPercentage: 0.6,  
      ...(numberOfUsers < 6 && { barThickness: 50 })    
    };
  }  
  
  /**
   * Lesson plan by subject bar chart   *
   */
  updateSubjectChartData(data: any): void {
    const labels = this.extractSubLabels(data);
    const dataset = this.createSubDataset(data);

    this.bySubjectBarChartData = {
      labels: labels,
      datasets: [dataset]
    };
  }

  extractSubLabels(data: any): string[] {
    const labels = data.lessonPlanCountBySubject.map((item: any) => this.utilityService.getSubjectDisplayName(item.subject));
    return labels
  }

  createSubDataset(data: any): any {
    const numberOfRecords = data.lessonPlanCountBySubject.length;
    return {
      data: data.lessonPlanCountBySubject.map((item: any) => item.lessonPlanCount),
      label: 'No. of Lesson Plans',
      backgroundColor: '#8353E2',
      hoverBackgroundColor: '#8353E2',
      borderColor:'#FFFFFF',
      categoryPercentage: 0.8,
      barPercentage: 0.6,  
      ...(numberOfRecords < 6 && { barThickness: 50 })
    };
  }

  /**
   * Lesson plan by Medium Donut chart   *
   */
  updateMediumDonutChartData(data: any): void {
    const labels = ['Kannada', 'English'];
    const dataset = this.createMediumDataset(data);

    this.byMediumDonutChartData = {
      labels: labels,
      datasets: [dataset]
    };
  }

  createMediumDataset(data: any): any {
    // Initialize the counts array with zeros for Kannada and English
    const counts = [0, 0];
    
    // Map medium names to index in the counts array
    const mediumMapping: { [key: string]: number } = {
      'Kannada': 0, 
      'English': 1
    };
    
    // Loop through the mediumLessonPlanCount data and update the counts
    data.lessonPlanCountByMedium.forEach((item: any) => {
      const mediumName = this.capitalizeFirstLetter(item.medium);
      const index = mediumMapping[mediumName];
      if (index !== undefined) {
        counts[index] = item.lessonPlanCount;
      }
    });
    
    return {
      data: counts,
      backgroundColor: ['#ED7D2D', '#F9D8C0'],
      hoverBackgroundColor: ['#ED7D2D', '#F9D8C0'],
      borderColor: ['rgba(0, 0, 0, 0)'],
      borderWidth: 0
    };
  }

  /**
   * Active/inactive users Donut chart   *
   */
  updateStatusDonutChartData(data: any): void {
    const labels = ['Active Users', 'Inactive Users'];
    const dataset = this.createStatusDataset(data);

    this.statusDonutChartData = {
      labels: labels,
      datasets: [dataset]
    };
    this.allUsersCount = data.userCounts.userCounts.activeUsers + data.userCounts.userCounts.inactiveUsers;
    this.activeUsersCount = data.userCounts.userCounts.activeUsers;
    this.inactiveUsersCount = data.userCounts.userCounts.inactiveUsers;

    this.statusDataAvailable = this.activeUsersCount > 0 || this.inactiveUsersCount > 0;
  }

  createStatusDataset(data: any): any {
    return {
      data: [data.userCounts.userCounts.activeUsers, data.userCounts.userCounts.inactiveUsers],
      backgroundColor: ['#46A0F1', '#E5696D'],
      hoverBackgroundColor:['#46A0F1', '#E5696D'],
      borderColor: ['rgba(0, 0, 0, 0)'],
      borderWidth: 0,
      label: 'User Status'
    };
  }

  filterUsers(allUsersList: any[], userMediumMetrics: any[], medium: string): void {
    if (medium === 'all') {
      this.filteredUsersList = allUsersList;
    } else {
      const mediumData = userMediumMetrics.find((m: { medium: string; }) => m.medium === medium);
      this.filteredUsersList = mediumData ? mediumData.users : [];
    }
  }

  setMedium(medium: string): void {
    this.selectedMedium = medium;
    this.filterUsers(this.allUsersList, this.userMediumMetrics, this.selectedMedium);
  }

  navigateToUserMgmt(selectedSchoolId:any) {    
    this.route.navigate(['admin/user-management/list']);
  }

  /**
   * Average score Donut chart   *
   */
  updateAvgFbScoreDonutChartData(data: any): void {
    const labels = ["Very good", "Needs improvement", "Doesn't meet requirement"];
    const dataset = this.createAvgFbDataset(data);

    this.avgFeedbackDonutChartData = {
      labels: labels,
      datasets: [dataset]
    };

  }

  createAvgFbDataset(data: any): any {
    // Initialize the count array with zeros for the three categories
    const counts = [0, 0, 0];
  
    // Map feedback text to index in the counts array
    const feedbackMapping: { [key: string]: number } = {
      'Very good to use in the classroom': 0, // Above Average
      'Needs some improvement to use in the classroom': 1, // Average
      'Does not meet the requirements to use it in the classroom.': 2 // Below Average
    };
  
    // Loop through the feedback data and update the counts
    data.feedbackCount.forEach((item: any) => {
      const index = feedbackMapping[item._id];
      if (index !== undefined) {
        counts[index] = item.count;
      }
    });
  
    return {
      data: counts,
      backgroundColor: ['#379AE6','#82c2f3', '#C3E1F8'],
      hoverBackgroundColor: ['#379AE6','#82c2f3', '#C3E1F8'],
      borderColor: ['rgba(0, 0, 0, 0)'],
      borderWidth: 0
    };
  }

  /**
   * chatbot requests bar chart   *
   */
  updateChatbotRequestsChartData(data: any): void {
    const labels = this.extractChatbotRequestsLabels(data);
    const eduChatDataset = this.createChatbotRequestsDataset(data);
    const lessonChatDataset = this.createLessonChatRequestsDataset(data);    

    this.chatbotRequestsBarChartData = {
      labels: labels,
      datasets: [eduChatDataset,lessonChatDataset]
    };
  }

  extractChatbotRequestsLabels(data: any): string[] {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const labels = data.botRequestCount.map((item: any) => {
      const [year, month] = item.month.split("-");
      const monthIndex = parseInt(month) - 1; // Convert month to zero-based index
      return `${monthNames[monthIndex]} ${year}`;
    });

    return labels;
  }

  createChatbotRequestsDataset(data: any): any {
    return {
      data: data.botRequestCount.map((item: any) => item.requestCount),
      label: 'Edu Chat',
      backgroundColor: '#379AE6',
      hoverBackgroundColor: '#379AE6',
      borderColor:'#FFFFFF',
      barPercentage:0.8,
      categoryPercentage:0.5
    };
  }  

  createLessonChatRequestsDataset(data: any): any {
    return {
      data: data.lessonbotRequestCount.map((item: any) => item.requestCount),
      label: 'Lesson Chat',
      backgroundColor: '#ED7D2D',
      hoverBackgroundColor: '#ED7D2D',
      borderColor:'#FFFFFF',
      barPercentage:0.8,
      categoryPercentage:0.5
    };
  }  

  areFiltersSelected(): boolean {
    // Check if all required filters are selected
    return this.selectedState != null 
  }  
  
  exportDashboardDataToExcel(): void {    
  
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Dashboard Data');
    let rowIndex = 1;
  
    // Add main heading
    this.addMainHeading(worksheet, 'Dashboard', rowIndex, 18);
  
    // Merge cells in the row below the main heading
    rowIndex += 1; // Move to the row after the main heading and add a blank row
    worksheet.mergeCells(rowIndex, 1, rowIndex, 8); // Adjust the column range as needed
  
    // Move to the next row after merging cells
    rowIndex += 1;
  
    // Add filters row
    rowIndex = this.addFiltersRow(worksheet, rowIndex);
  
    // Merge cells in the row after filters
    worksheet.mergeCells(rowIndex, 1, rowIndex, 8); 
  
    // Move to the next row after merging cells
    rowIndex += 1;
  
    // Get the selected plan type from the dropdown (assuming this is a property on the component)
    const selectedPlanType = this.selectedPlanType; // Either 'Lesson' or 'Resource'
  
    // Add sections side by side
    rowIndex = this.addSectionsSideBySide(worksheet, rowIndex, selectedPlanType);
  
    // Apply borders to the entire report based on the actual data
    this.applyFullBorder(worksheet);
  
    // Apply column widths
    this.setColumnWidths(worksheet);
  
    // Save the workbook
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: EXCEL_TYPE });
      saveAs(blob, 'dashboard_data.xlsx');
      this.utilityService.showSuccess('Report has been downloaded successfully.');
    }).catch((error) => {
      this.utilityService.showError(error);
    });
  }  

  addSectionsSideBySide(
    worksheet: ExcelJS.Worksheet,
    rowIndex: number,
    selectedPlanType: string
  ): number {
    const columnOffsets = [1, 3, 5];
  
    // Determine the label based on the selected dropdown filter
    let filterLabel = 'State';
    if (this.selectedSchoolId) {
      filterLabel = 'User';
    } else if (this.selectedBlock) {
      filterLabel = 'School';
    } else if (this.selectedDistrict) {
      filterLabel = 'Taluk';
    } else if (this.selectedZone) {
      filterLabel = 'District';
    } else if (this.selectedState) {
      filterLabel = 'Zone';
    }
  
    // Determine the number label based on the selected plan type
    const numberLabel = selectedPlanType === 'lesson' ? 'No. of Lesson Plans' : 'No. of Lesson Resources';
  
    // Define the sections based on the selected plan type and filter label
    const sections = selectedPlanType === 'lesson' ? [
      {
        title: `Lesson Plans by ${filterLabel}`,
        data: this.byUserBarChartData,
        subHeading1: filterLabel,
        subHeading2: numberLabel
      },
      {
        title: 'Lesson Plans by Subject',
        data: this.bySubjectBarChartData,
        subHeading1: 'Subject',
        subHeading2: numberLabel
      },
      {
        title: 'Lesson Plans by Medium',
        data: this.byMediumDonutChartData,
        subHeading1: 'Medium',
        subHeading2: numberLabel
      }
    ] : [
      {
        title: `Lesson Resources by ${filterLabel}`,
        data: this.byUserBarChartData,
        subHeading1: filterLabel,
        subHeading2: numberLabel
      },
      {
        title: 'Lesson Resources by Subject',
        data: this.bySubjectBarChartData,
        subHeading1: 'Subject',
        subHeading2: numberLabel
      },
      {
        title: 'Lesson Resources by Medium',
        data: this.byMediumDonutChartData,
        subHeading1: 'Medium',
        subHeading2: numberLabel
      }
    ];
  
    // Add the first group of sections
    sections.forEach((section, index) => {
      this.addSectionToSheet(
        worksheet,
        section.title,
        section.data,
        [section.subHeading1, // First subheading (e.g., State, Subject, Medium)
          section.subHeading2], // Second subheading (e.g., No. of Lesson Plans or No. of Lesson Resources)
        rowIndex,
        columnOffsets[index],
        true
      );
    });
  
    const firstGroupMaxRows = Math.max(
      ...sections.map(section => this.getRowsUsedForSection(section.data))
    );
  
    const nextRowIndex = rowIndex + firstGroupMaxRows + 2;
    this.addMainHeading(worksheet, 'All Users Info', nextRowIndex, 14);
  
    // Merge cells in the row below 'All Users Info' heading
    const allUsersInfoRowIndex = nextRowIndex + 1;
    worksheet.mergeCells(allUsersInfoRowIndex, 1, allUsersInfoRowIndex, 8);
  
    // Move to the next row after merging cells
    const secondGroupStartRowIndex = allUsersInfoRowIndex + 1;
  
    const secondSections = [
      {
        title: 'Users Status Data',
        data: this.statusDonutChartData,
        subHeading1: 'User Status',
        subHeading2: 'No. of Users'
      },
      {
        title: 'Avg Feedback Data',
        data: this.avgFeedbackDonutChartData,
        subHeading1: 'Feedback Level',
        subHeading2: 'Feedback Score'
      },
      {
        title: 'Chatbot Requests Data',
        data: this.chatbotRequestsBarChartData,
        subHeading1: 'Month',
        subHeading2: 'No. of Edu chat',
        subHeading3: 'No. of Lesson chat',
      }
    ];
  
    // Add the second group of sections
    secondSections.forEach((section, index) => {
      const headings = [section.subHeading1, section.subHeading2];
      if (section.subHeading3) {
        headings.push(section.subHeading3);
      }
      this.addSectionToSheet(
        worksheet,
        section.title,
        section.data,
        headings,
        secondGroupStartRowIndex,
        columnOffsets[index],
        true
      );
    });
  
    const secondGroupMaxRows = Math.max(
      ...secondSections.map(section => this.getRowsUsedForSection(section.data))
    );
  
    return secondGroupStartRowIndex + secondGroupMaxRows;
  }
  
      
  getRowsUsedForSection(chartData: any): number {
    return chartData.labels && chartData.labels.length > 0 ? chartData.labels.length + 3 : 4; // Rows for title, headers, and data
  }

  setColumnWidths(worksheet: ExcelJS.Worksheet): void {
    worksheet.columns = [
      { width: 25 }, // Column 1 width
      { width: 25 }, // Column 2 width
      { width: 25 }, // Column 3 width
      { width: 25 }, // Column 4 width
      { width: 25 }, // Column 5 width  
      { width: 25 },
      { width: 20 },
      { width: 20 }  
    ];
  }

  addSectionToSheet(
  worksheet: ExcelJS.Worksheet,
  sectionTitle: string,
  chartData: any,
  headingLabels:any[],
  startRowIndex: number,
  startColumnIndex: number,
  mergeCells: boolean = false
): number {
    let rowIndex = startRowIndex;
    let colIndex = startColumnIndex;

    // Add section title
    const titleCell = worksheet.getCell(rowIndex, colIndex);
    titleCell.value = sectionTitle;
    titleCell.font = { bold: true, size: 14 };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    if (mergeCells) {
      worksheet.mergeCells(rowIndex, colIndex, rowIndex, colIndex + (headingLabels.length-1));
    }

    worksheet.getRow(rowIndex).height = 25;
    rowIndex += 1;

    // Add custom headers with background color
    const headerRow = worksheet.getRow(rowIndex);
    const headers = headingLabels;
    headers.forEach((header, i) => {
      const cell = worksheet.getCell(rowIndex, colIndex + i);
      cell.value = header;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D3D3D3' } };
    });
  
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    rowIndex += 1;

    // Add data rows
    if (chartData.labels && chartData.labels.length > 0) {
      chartData.labels.forEach((label: string, index: number) => {
        worksheet.getCell(rowIndex, colIndex).value = label;
        for(let j=0;j<chartData.datasets.length;j++){
          worksheet.getCell(rowIndex, colIndex + j + 1).value = chartData.datasets[j].data[index] ?? 0;
        }
        rowIndex += 1;
      });
    } else {
    worksheet.getCell(rowIndex, colIndex).value = 'No Data';
    worksheet.getCell(rowIndex, colIndex + 1).value = 0;
    rowIndex += 1;
  }

  // Add a blank row for separation
  rowIndex += 1;

  // Apply table formatting (assuming you have this method)
  this.applyTableFormatting(worksheet, startRowIndex, rowIndex);

  return rowIndex;
  }

  applyTableFormatting(
  worksheet: ExcelJS.Worksheet,
  startRowIndex: number,
  endRowIndex: number
  ): void {
  const headerRow = worksheet.getRow(startRowIndex);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center', vertical:'middle' };

    for (let rowIndex = startRowIndex + 1; rowIndex < endRowIndex; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      row.alignment = { horizontal: 'center' };
    }
  }

  addMainHeading(worksheet: ExcelJS.Worksheet, heading: string, rowIndex: number, fontSize: number = 16): void {
    worksheet.getCell(rowIndex, 1).value = heading;
    worksheet.getCell(rowIndex, 1).font = { bold: true, size: fontSize };
    worksheet.getCell(rowIndex, 1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells(rowIndex, 1, rowIndex, 8); // Merge cells for the main heading
    worksheet.getRow(rowIndex).height = 30; // You can adjust the height as needed
  }

  formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  addFiltersRow(worksheet: ExcelJS.Worksheet, rowIndex: number): number {
    // Define filters
    const filters: {
      state: string;
      zone: string;
      district: string;
      taluk: string;
      school: string;
      planType:string;
      from:string;
      to:string
    } = {
      state: this.selectedState ? this.selectedState : 'Overall',
      zone: this.selectedZone ? this.selectedZone : '-',
      district: this.selectedDistrict ? this.selectedDistrict : '-',
      taluk: this.selectedBlock ? this.selectedBlock : '-',
      school: this.selectedSchoolName ? this.selectedSchoolName : '-',
      planType: this.selectedPlanType === 'lesson' ? 'Lesson Plan' : this.selectedPlanType === 'resource' ? 'Resource Plan' : '-',
from: this.selectedFromDate ? this.formatDate(this.selectedFromDate) : '-',
      to: this.selectedToDate ? this.formatDate(this.selectedToDate) : '-',
    };

  let columnIndex = 1;

  // Define background color for filter headings
  const headingColor = 'FFFF00'; // Yellow background

  // Add filter labels and values horizontally
  (['state', 'zone', 'district', 'taluk', 'school','planType','from', 'to'] as const).forEach((filter) => {
    const headingCell = worksheet.getCell(rowIndex, columnIndex);
    headingCell.value = filter.charAt(0).toUpperCase() + filter.slice(1); // Capitalize first letter
    headingCell.font = { bold: true };
    headingCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headingColor }
    };
    headingCell.border = {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    };
    headingCell.alignment = { horizontal: 'center' }; 

      const valueCell = worksheet.getCell(rowIndex + 1, columnIndex);
      valueCell.value = filters[filter];
      valueCell.border = {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
      };
      valueCell.alignment = { horizontal: 'center' };

      columnIndex++;
    });

    // Increment rowIndex to account for the filters row and the blank row
    rowIndex += 1;
  
    return ++rowIndex;
  }

  applyFullBorder(worksheet: ExcelJS.Worksheet): void {
    const lastRow = worksheet.lastRow?.number || 1;
    const lastColumn = worksheet.columns.length;

    for (let rowIndex = 1; rowIndex <= lastRow; rowIndex++) {
      for (let colIndex = 1; colIndex <= lastColumn; colIndex++) {
        const cell = worksheet.getCell(rowIndex, colIndex);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }
  }


}


