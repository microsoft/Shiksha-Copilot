import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { QuestionBankService } from '../question-bank.service';
import { UtilityService } from 'src/app/core/services/utility.service';
import { Router } from '@angular/router';
import { DropDownConfig } from 'src/app/shared/interfaces/dropdown.interface';
import {
  debounceTime,
  distinctUntilChanged,
  Subject,
  Subscription,
} from 'rxjs';

interface ListParams {
  board?: string;
  medium?: string;
  grade?: string;
  subject?: string;
  search?: string;
}
@Component({
  selector: 'app-question-bank-list',
  templateUrl: './question-bank-list.component.html',
  styleUrls: ['./question-bank-list.component.scss'],
})
export class QuestionBankListComponent implements OnInit, AfterViewInit, OnDestroy {
  list: any[] = [];
  boardDropdownOptions: any[] = [];
  mediumDropdownOptions: any[] = [];
  classDropdownOptions: any[] = [];
  subjectDropdownOptions: any[] = [];

  boardDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Board',
    height: 'auto',
    bindLabel: 'board',
    bindValue: 'board',
    labelTxt: 'Board',
  };

  mediumDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Medium',
    height: 'auto',
    bindLabel: 'medium',
    bindValue: 'medium',
    labelTxt: 'Medium',
  };

  classDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Class',
    height: 'auto',
    bindLabel: 'class',
    bindValue: 'class',
    labelTxt: 'Class',
  };

  subjectDropdownconfig: DropDownConfig = {
    isBackground: false,
    placeHolderTxt: 'Subject',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'name',
    labelTxt: 'Subject',
  };

  selectedBoard!: any;
  selectedMedium!: any;
  selectedClass!: any;
  selectedSubject!: any;
  searchText!: string;

  @ViewChild('boardDropDown') boarddropdown: any;
  @ViewChild('mediumDropDown') mediumdropdown: any;
  @ViewChild('classDropDown') classdropdown: any;
  @ViewChild('subjectDropDown') subjectdropdown: any;

  private searchSubscription!: Subscription;
  private searchTerms = new Subject<string>();

  /**
   * Class constructor
   * @param questionBankService QuestionBankService
   * @param utilityService UtilityService
   * @param router Router
   */
  constructor(
    private questionBankService: QuestionBankService,
    private utilityService: UtilityService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.searchSubscription = this.searchTerms
      .pipe(
        debounceTime(1000),
        distinctUntilChanged()
      )
      .subscribe((searchTerm) => {
        this.searchText = searchTerm;
        const params = this.getListParams();
        this.getAllQuestionPapers(params);
      });
  }

  private getListParams(): ListParams {
    return {
      board: this.selectedBoard,
      medium: this.selectedMedium,
      grade: this.selectedClass,
      subject: this.selectedSubject,
      search: this.searchText,
    };
  }

  searchInputChanged(e: any) {
    this.searchTerms.next(e.target.value);
  }

  ngAfterViewInit(): void {
    const loggedUSer = this.utilityService.loggedInUserData;
    this.boardDropdownOptions = this.utilityService.formatResponse(
      loggedUSer.classes
    );

    if (this.boardDropdownOptions.length === 1) {
      this.boarddropdown.selectedItem = this.boardDropdownOptions[0].board;
      this.selectedBoard = this.boardDropdownOptions[0].board;
      this.mediumDropdownOptions = this.filterMediumByBoard(
        this.boardDropdownOptions,
        this.boarddropdown.selectedItem
      )[0].mediums;
    }

    if (this.mediumDropdownOptions.length === 1) {
      this.mediumdropdown.selectedItem = this.mediumDropdownOptions[0].medium;
      this.selectedMedium = this.mediumDropdownOptions[0].medium;
      this.classDropdownOptions = this.filterClassByMedium(
        this.mediumDropdownOptions,
        this.mediumdropdown.selectedItem
      )[0].classes?.sort((a: any, b: any) => a.class - b.class);
    }

    if (this.classDropdownOptions.length === 1) {
      this.classdropdown.selectedItem = this.classDropdownOptions[0].class;
      this.selectedClass = this.classDropdownOptions[0].class;
      const subjectDropdownValue = this.filterSubjectByClass(
        this.classDropdownOptions,
        this.classdropdown.selectedItem
      )[0].data;
      this.subjectDropdownOptions =
        this.utilityService.formatSubjecter(subjectDropdownValue);
    }

    if (this.subjectDropdownOptions.length === 1) {
      this.subjectdropdown.selectedItem =
        this.subjectDropdownOptions[0].subject;
      this.selectedSubject = this.subjectDropdownOptions[0].subject;
    }

    const param = this.getListParams();

    this.getAllQuestionPapers(param);
  }

  filterMediumByBoard(dropdownValue: any, selecteItem: any) {
    return dropdownValue.filter((item: any) => item.board === selecteItem);
  }

  filterClassByMedium(dropdownValue: any, selecteItem: any) {
    return dropdownValue.filter((item: any) => item.medium === selecteItem);
  }

  filterSubjectByClass(dropdownValue: any, selecteItem: any) {
    return dropdownValue.filter((item: any) => item.class === selecteItem);
  }

  onBoardChange(val: any) {
    this.selectedBoard = val;
    this.resetBoardChange();
    if (val) {
      const mediumFilter = this.boardDropdownOptions.filter(
        (item) => item.board === this.selectedBoard
      );
      this.mediumDropdownOptions = mediumFilter[0].mediums;
    }
    const params = this.getListParams();
    this.getAllQuestionPapers(params);
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
    this.selectedMedium = val;
    this.resetMediumChange();
    if (val) {
      const classFilter = this.mediumDropdownOptions.filter(
        (item) => item.medium === this.selectedMedium
      );
      this.classDropdownOptions = classFilter[0].classes?.sort(
        (a: any, b: any) => a.class - b.class
      );
    }
    const params = this.getListParams();
    this.getAllQuestionPapers(params);
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
    this.selectedClass = val;
    this.resetClassChange();
    if (val) {
      const subjectFilter = this.classDropdownOptions.filter(
        (item) => item.class === this.selectedClass
      );

      this.subjectDropdownOptions = this.utilityService.formatSubjecter(subjectFilter[0].data)
    }
    const params = this.getListParams();
    this.getAllQuestionPapers(params);
  }

  onSubjectChange(val: any) {
    this.selectedSubject = val;
    const params = this.getListParams();
    this.getAllQuestionPapers(params);
  }

  getAllQuestionPapers(params: any) {
    this.questionBankService.getAllQuestionBanks(params).subscribe({
      next: (res: any) => {
        this.list = res.data.results;
      },
      error: (err) => {
        this.utilityService.handleError(err)
      },
    });
  }

  viewQuestionPaper(id: any) {
    this.router.navigate([`/user/question-paper/view/${id}`]);
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
}
