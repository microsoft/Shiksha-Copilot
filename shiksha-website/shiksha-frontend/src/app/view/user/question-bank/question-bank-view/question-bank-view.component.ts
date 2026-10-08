import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionBankService } from '../question-bank.service';
import { UtilityService } from 'src/app/core/services/utility.service';
import { slideInOutAnimation } from 'src/app/shared/utility/animations.util';
import { IdleService } from 'src/app/shared/services/idle.service';
import { QUESTION_TYPE_MAPPER } from 'src/app/shared/utility/constant.util';
import { QuestionBankDownloadService } from 'src/app/shared/services/question-bank-download.service';
import { BluePrintExportService } from 'src/app/shared/services/blue-print.export.service';
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

  primaryColumn:any[] = [];

  questionBankBluePrintData:any;

  docTypes = [
    {
      name:'Question Paper',
      type:'qp'
    },
    {
      name:'Blueprint',
      type:'bp'
    }
  ]

  constructor(
    private route: ActivatedRoute,
    private questionBankService: QuestionBankService,
    public utilityService: UtilityService,
    private router:Router,
    private idleService:IdleService,
    private questionBankDownloadService:QuestionBankDownloadService,
    private bluePrintExportService:BluePrintExportService
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
            const colTwoVal = structuredClone(matchTheFollowingData[0]?.questions.map((ele:any)=> ele.value2))
            this.primaryColumn = matchTheFollowingData[0]?.questions.map((ele:any)=> ele.value1);
            this.shuffledColumns = this.utilityService.shuffleOptions(colTwoVal)
          }
          
          if (this.questionBankDetails?.questionBank?.feedback) {
            this.questionBankFeedback =
              this.questionBankDetails?.questionBank?.feedback;
          }
          this.idleService.planId = this.questionBankDetails?.questionBank?._id;
          this.questionBankBluePrintData = this.flattenQuestionData(val.data.bluePrintTemplate);
        },
        error: (err) => {
          this.utilityService.handleError(err);
        },
      });
  }

  flattenQuestionData(data:any[]) {
    const result:any[] = [];
    data.forEach(section => {
        const { type, marksPerQuestion, questionDistribution } = section;

        questionDistribution.forEach((entry:any) => {
            result.push({
                unitName: entry.unitName,
                type:this.questionTypeMapper[type],
                objective: entry.objective,
                marks: marksPerQuestion
            });
        });
    });

    return result;
}

download(type:any){
  if(type === 'qp'){
    this.downloadQp()
  }else{
    this.downloadBluePrint()
  }
}
  
  downloadQp() {
    this.questionBankDownloadService.downloadQuestionBank(this.questionBankDetails);
    this.utilityService.showSuccess('Question paper downloaded successfully!');
  }

  downloadBluePrint(){
    const metaData = {
      schoolName:this.questionBankDetails?.questionBank?.metadata?.schoolName,
      medium:this.questionBankDetails?.medium,
      class:this.questionBankDetails?.grade,
      subject:this.questionBankDetails?.subject,
      examinationName:this.questionBankDetails?.examinationName,
      totalMarks:this.questionBankDetails?.totalMarks
    }
    this.bluePrintExportService.exportToWord(this.questionBankBluePrintData,metaData)
  }

  backNavigation(){
      this.router.navigate(['/user/question-paper']);
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
