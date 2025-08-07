import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContentActivityService } from '../content-activity/content-activity.service';
import { UtilityService } from 'src/app/core/services/utility.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-view-lesson-plan',
  templateUrl: './view-lesson-plan.component.html',
  styleUrls: ['./view-lesson-plan.component.scss']
})
export class ViewLessonPlanComponent implements OnInit, OnDestroy{

  selectedTab = 'Learning Outcomes';
  tableHeaders = [
    'Board',
    'Medium',
    'Class',
    'Subject',
    'Chapter',
    'Sub-Topic',
  ];
  tabs:any[]=[];
  learningOutcomes: any[] = [];
  lessonPlanId: string | null = null;
  data:any;
  routeSubs!:Subscription;

  constructor(private route: ActivatedRoute, private contentActService:ContentActivityService, public utilityService:UtilityService){}

  ngOnInit(): void {
    this.routeSubs = this.route.paramMap.subscribe(params => {
      this.lessonPlanId = params.get('id');
      if (this.lessonPlanId) {
        this.getLessonPlanDetails(this.lessonPlanId);
      }
    });
  }

  getLessonPlanDetails(id:any){
    this.contentActService.getLessonPlanDetFrmContentActivity(id).subscribe({
      next:(res:any)=>{
        this.data = res.data[0];
        this.tabs = this.data.instructionSet;
        this.learningOutcomes = this.data.learningOutcomes;
      },
      error:(err)=>{
        this.utilityService.handleError(err);
      }
    });
  }

  selectTab(tabName: string): void {
    this.selectedTab = tabName;
  }

  ngOnDestroy(): void {
    this.routeSubs.unsubscribe();
  }

}
