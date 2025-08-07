import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DropDownConfig } from 'src/app/shared/interfaces/dropdown.interface';
import { ContentGenerationService } from '../content-generation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UtilityService } from 'src/app/core/services/utility.service';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
interface ListParams {
  currentPage: number;
  pageSize: number;
  selectedType?: string;
  selectedBoard?: string;
  selectedMedium?: string;
  selectedClass?: string;
  selectedSubject?: string;
  searchTerm?: string;
  selectedMonth?: number,
  isCompleted?:string,
  isGenerated?:string
}

@Component({
  selector: 'app-lesson-content-list',
  templateUrl: './lesson-content-list.component.html',
  styleUrls: ['./lesson-content-list.component.scss']
})
export class LessonContentListComponent implements OnInit, AfterViewInit, OnDestroy {

  currentPage = 1;
  pageSize = 6;
  totalItems = 0;
  tableHeaders = ['Date', 'Class', 'Subject', 'Type', 'Chapter', 'Sub Topics', 'Action'];

  typeDropdownOptions: any[] = [{ name: 'Lesson Plan', value: 'lesson' }, { name: 'Resource Plan', value: 'resource' },{ name: 'All', value: 'all' }];
  boardDropdownOptions: any[] = [];
  mediumDropdownOptions: any[] = [];
  classDropdownOptions: any[] = [];
  subjectDropdownOptions: any[] = [];
  statusDropdownOptions: any[] = [{name:'Saved Plans',value:'true'},{name:'Drafted Plans',value:'false'},{name:'All',value:'all'}];

  showFilterPopUp: boolean = false;

  typeDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Type',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'value',
    clearableOff :true,
    labelTxt:'Plan Type'
  };
  boardDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Board',
    height: 'auto',
    bindLabel: 'board',
    bindValue: 'board',
    labelTxt:'Board'
  };
  mediumDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Medium',
    height: 'auto',
    bindLabel: 'medium',
    bindValue: 'medium',
    labelTxt:'Medium'
  };
  classDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Class',
    height: 'auto',
    bindLabel: 'class',
    bindValue: 'class',
    labelTxt:'Class'
  };
  subjectDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Subject',
    height: 'auto',
    bindLabel: 'displayName',
    bindValue: 'subject',
    labelTxt:'Subject'
  };

  statusDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Plan Status',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'value',
    clearableOff:true,
    labelTxt:'Plan Status'
  };


  list: any[] = [];
  classes!: any[];
  selectedType: string = "all";
  selectedBoard!: any;
  selectedMedium!: any;
  selectedClass!: any;
  selectedSubject!: any;
  selectedMonth!: any;
  searchText!: string;
  private searchTerms = new Subject<string>();
  classList: any[] = []
  isCompleted:any = '';
  type:any;
  typeSubscription:Subscription;
  private searchSubscription!: Subscription;


  @ViewChild('typeDropDown') typedropdown: any;
  @ViewChild('boardDropDown') boarddropdown: any;
  @ViewChild('mediumDropDown') mediumdropdown: any;
  @ViewChild('classDropDown') classdropdown: any;
  @ViewChild('subjectDropDown') subjectdropdown: any;
  @ViewChild('statusDropDown') statusDropDown: any;

  private getListParams(): ListParams {
    const formattedMonth = this.selectedMonth ? this.selectedMonth.split('-')[1] : null;

    return {
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      selectedType: this.selectedType,
      selectedBoard: this.selectedBoard,
      selectedMedium: this.selectedMedium,
      selectedClass: this.selectedClass,
      selectedSubject: this.selectedSubject,
      selectedMonth: formattedMonth,
      searchTerm: this.searchText,
      isCompleted:this.isCompleted,
      isGenerated:this.type === 'generated' ? 'false':'true',
    };
  }

  constructor(private contentGenService: ContentGenerationService, private router: Router, private cdr: ChangeDetectorRef, public utilityservice: UtilityService,private activatedRoute: ActivatedRoute) {
   this.typeSubscription = this.activatedRoute.data.subscribe((data: any) => {
      this.type = data.type;
    });
   }

  ngOnInit(): void {
    // const params: ListParams = {
    //   currentPage: this.currentPage,
    //   pageSize: this.pageSize
    // };
    // this.getAllList(params);

    const data: string = localStorage.getItem('userData') ?? '';
    const loggedInUser = JSON.parse(data);

    // this.getBoardsList(loggedInUser);

   this.searchSubscription = this.searchTerms.pipe(
      debounceTime(1000), // Adjust the debounce time as needed
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.searchText = searchTerm;
      const params = this.getListParams();
      this.getAllList(params);
    });
  }

  ngAfterViewInit(): void {
  if(this.type === 'generated'){
    this.typedropdown.selectedItem = this.selectedType;
    this.statusDropDown.selectedItem = 'all'
  }
    this.cdr.detectChanges();
    const loggedUSer = this.utilityservice.loggedInUserData;
    this.boardDropdownOptions = this.utilityservice.formatResponse(loggedUSer.classes);
    
    if(this.boardDropdownOptions.length === 1){
      this.boarddropdown.selectedItem = this.boardDropdownOptions[0].board;
      this.selectedBoard = this.boardDropdownOptions[0].board;
      this.mediumDropdownOptions = this.filterMediumByBoard(this.boardDropdownOptions,this.boarddropdown.selectedItem)[0].mediums;

    }

    if(this.mediumDropdownOptions.length === 1){
      this.mediumdropdown.selectedItem = this.mediumDropdownOptions[0].medium;
      this.selectedMedium = this.mediumDropdownOptions[0].medium;
      this.classDropdownOptions = this.filterClassByMedium(this.mediumDropdownOptions,this.mediumdropdown.selectedItem)[0].classes?.sort((a:any,b:any)=>a.class-b.class)
    }

    if(this.classDropdownOptions.length === 1){
      this.classdropdown.selectedItem = this.classDropdownOptions[0].class;
      this.selectedClass = this.classDropdownOptions[0].class;
      const subjectDropdownValue = this.filterSubjectByClass(this.classDropdownOptions,this.classdropdown.selectedItem)[0].data;
      this.subjectDropdownOptions = this.utilityservice.formatSubjectDropdown(subjectDropdownValue)
    }

    if(this.subjectDropdownOptions.length === 1){
      this.subjectdropdown.selectedItem = this.subjectDropdownOptions[0].subject;
      this.selectedSubject = this.subjectDropdownOptions[0].subject;
    }


    const param = this.getListParams();
   
    
    this.getAllList(param);
    
    
    

  }

  filterMediumByBoard(dropdownValue:any,selecteItem:any){
    
    
    
    return dropdownValue.filter((item:any)=>item.board === selecteItem);
  }

  filterClassByMedium(dropdownValue:any,selecteItem:any){
 
    
    return dropdownValue.filter((item:any)=>item.medium === selecteItem);
  }

  filterSubjectByClass(dropdownValue:any,selecteItem:any){
    return dropdownValue.filter((item:any)=>item.class === selecteItem);
  }

  onTypeChange(val: any) {
    this.currentPage = 1;
    this.selectedType = val;
    // this.boarddropdown.selectedItem = null;
    // this.selectedBoard = null;
    // this.selectedMonth = null;
    // this.searchText = '';
    // this.resetBoardChange();
    const params = this.getListParams();
    this.getAllList(params);
  }

  onBoardChange(val: any) {
    this.currentPage = 1;
    this.selectedBoard = val;
    this.resetBoardChange();
    if (val) {
      const mediumFilter = this.boardDropdownOptions.filter(item => item.board === this.selectedBoard);
      this.mediumDropdownOptions = mediumFilter[0].mediums;      
    }
    const params = this.getListParams();
    this.getAllList(params);
  }

  resetBoardChange() {
    this.mediumdropdown.selectedItem = null;
    this.selectedMedium = null;
    this.classdropdown.selectedItem = null;
    this.selectedClass = null;
    this.subjectdropdown.selectedItem = null;
    this.selectedSubject = null;
    this.mediumDropdownOptions = [];
    this.classDropdownOptions = [];
    this.subjectDropdownOptions = [];
  }

  onMediumChange(val: any) {
    this.currentPage = 1;
    this.selectedMedium = val;
    this.resetMediumChange();
    if (val) {
      const classFilter = this.mediumDropdownOptions.filter(item => item.medium === this.selectedMedium);
      this.classDropdownOptions = classFilter[0].classes?.sort((a:any,b:any)=>a.class-b.class)    
    }
    const params = this.getListParams();
    this.getAllList(params);
  }

  resetMediumChange() {
    this.classdropdown.selectedItem = null;
    this.selectedClass = null;
    this.subjectdropdown.selectedItem = null;
    this.selectedSubject = null;
    this.classDropdownOptions = [];
    this.subjectDropdownOptions = [];
  }

  resetClassChange() {
    this.subjectdropdown.selectedItem = null;
    this.selectedSubject = null;
    this.subjectDropdownOptions = [];
  }

  onClassChange(val: any) {
    this.currentPage = 1;
    this.selectedClass = val;
    this.resetClassChange();
    if (val) {
      const subjectFilter = this.classDropdownOptions.filter(item => item.class === this.selectedClass);
      this.subjectDropdownOptions = this.utilityservice.formatSubjectDropdown(subjectFilter[0].data);     
    }
    const params = this.getListParams();
    this.getAllList(params);
  }

  onSubjectChange(val: any) {
    this.currentPage = 1;
    this.selectedSubject = val;

    const params = this.getListParams();
    this.getAllList(params);
  }

  onMonthSelection(event: any) {
    this.currentPage = 1;
    this.selectedMonth = event.target.value;

    const params = this.getListParams();
    this.getAllList(params);
  }

  onStatusChange(val:any) {
    if(val === 'all'){
      this.isCompleted='';
    }else{
      this.isCompleted=val;
    }
    this.currentPage = 1;
    const params = this.getListParams();
    this.getAllList(params);
  }

  getAllList(params: ListParams) {
    this.contentGenService.getAllList(params).subscribe({
      next: (res: any) => {
        this.list = res.data;

        this.totalItems = res.data?.totalItems;
      },
      error: (err) => {
        console.error(err);
        this.utilityservice.handleError(err);
      }
    });
  }

  getBoardsList(userDetails: any) {
    let classList = [];
    classList = this.utilityservice.formatResponse(userDetails.classes);

    this.boardDropdownOptions = classList;
    if(this.boardDropdownOptions.length === 1){
      console.log(this.boardDropdownOptions[0].board);
      
      this.boarddropdown.selectedItem = this.boardDropdownOptions[0].board;
    }

  }

  onView(data: any) {
    if (data.isLesson) {
      this.router.navigate([`/user/content-generation/lesson-plan/${data.lesson._id}`]);
    }
    else {

      this.router.navigate([`/user/content-generation/resource-plan/${data.resource._id}`]);
    }
  }

  onViewDraft(data:any){
    if (data.isLesson) {
      this.router.navigate([`/user/content-generation/lesson-plan/draft/${data.lesson._id}`]);
    }
    else {

      this.router.navigate([`/user/content-generation/resource-plan/draft/${data.resource._id}`]);
    }
  }

  searchInputChanged(e: any) {
    this.searchTerms.next(e.target.value);
  }

  /**
  * pagination
  */

  onPageChange(page: number): void {
    this.currentPage = page;
    const params = this.getListParams();
    this.getAllList(params);
  }
  
  getPageNumbers(): number[] {
    return this.utilityservice.getPageNumbers(this.totalItems, this.pageSize);
  }

  retry(_id:any,regeneratedId:any){
    const obj = {
      _id,
      regeneratedId
    }

    this.contentGenService.retry(obj).
    subscribe({
      next:(res)=>{
        this.utilityservice.handleResponse(res);
        const param = this.getListParams();
        this.getAllList(param);
      },
      error:(err)=>{
        this.utilityservice.handleError(err);
      }
    })
  }

  chat(recordId:any, chapterId:any){
    this.router.navigate(['/user/content-generation/lesson-chat'],{queryParams:{recordId,chapterId}})
  }

  ngOnDestroy(): void {
    this.typeSubscription.unsubscribe();
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

}
