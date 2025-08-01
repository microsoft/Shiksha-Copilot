import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionBankService } from '../question-bank.service';
import { UtilityService } from 'src/app/core/services/utility.service';
import { slideInOutAnimation } from 'src/app/shared/utility/animations.util';
import { IdleService } from 'src/app/shared/services/idle.service';
import { QUESTION_TYPE_MAPPER } from 'src/app/shared/utility/constant.util';
import { QuestionBankDownloadService } from 'src/app/shared/services/question-bank-download.service';
@Component({
  selector: 'app-question-bank-view',
  templateUrl: './question-bank-view.component.html',
  styleUrls: ['./question-bank-view.component.scss'],
  animations: [slideInOutAnimation],
})
export class QuestionBankViewComponent implements OnInit {
  questionBankId: any;

  questionBankDetails: any;

  questionBank:any;

  isOpen = false;

  questionBankFeedbackQuestion =
    'Do you feel that the questions in this paper are relevant to your specified configuration and requirements?';

  questionBankFeedback = {
    feedback: '',
    overallFeedback: '',
  };

  questionBankFeedbackValues = [
    { name: 'Strongly Disagree', symbol: '😠' },
    { name: 'Disagree', symbol: '😕' },
    { name: 'Neutral', symbol: '😐' },
    { name: 'Agree', symbol: '🙂' },
    { name: 'Strongly Agree', symbol: '😃' },
  ];

  questionTypeMapper = QUESTION_TYPE_MAPPER;

  shuffledColumns:any[] = [];

  constructor(
    private route: ActivatedRoute,
    private questionBankService: QuestionBankService,
    public utilityService: UtilityService,
    private router:Router,
    private idleService:IdleService,
    private questionBankDownloadService:QuestionBankDownloadService
  ) {
    this.route.params.subscribe((params) => {
      this.questionBankId = params['id'];
    });
  }

  ngOnInit(): void {
    this.getQuestionBankDetails();
  }

  toggleAccordion(): void {
    this.isOpen = !this.isOpen;
  }

  getQuestionBankDetails() {
    this.questionBankService
      .getQuestionBankDetails(this.questionBankId)
      .subscribe({
        next: (val: any) => {
          this.questionBankDetails = val.data;
          this.questionBank = this.questionBankDetails.questionBank
          const matchTheFollowingData = this.questionBank?.questions?.filter((obj:any) => obj.type === 'Match the following');           
          if(matchTheFollowingData?.length){
            const colTwoVal = structuredClone(matchTheFollowingData[0]?.questions[0]?.columnTwoValues)
            this.shuffledColumns = this.utilityService.shuffleOptions(colTwoVal)
          }
          
          if (this.questionBankDetails?.questionBank?.feedback) {
            this.questionBankFeedback =
              this.questionBankDetails?.questionBank?.feedback;
          }
          this.idleService.planId = this.questionBankDetails?.questionBank?._id;
        },
        error: (err) => {
          this.utilityService.handleError(err);
        },
      });
  }
  
  downloadQp() {
    this.questionBankDownloadService.downloadQuestionBank(this.questionBankDetails);
    this.utilityService.showSuccess('Question paper downloaded successfully!');
  }

  backNavigation(){
      this.router.navigate(['/user/question-bank']);
  }

  submitFeedback() {
    const questionBankId = this.questionBankDetails?.questionBank?._id;
    const feedback = {
      question: this.questionBankFeedbackQuestion,
      ...this.questionBankFeedback,
    };
    this.questionBankService
      .updateQuestionBankFeedback(questionBankId, feedback)
      .subscribe({
        next: (res) => {
          this.utilityService.handleResponse(res);
          this.getQuestionBankDetails();
        },
        error: (err) => {
          this.utilityService.handleError(err);
        },
      });
  }
}
