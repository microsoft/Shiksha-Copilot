import { Component, OnInit } from '@angular/core';
import { ContentGenerationService } from '../content-generation.service';
import { Router } from '@angular/router';
import { UtilityService } from 'src/app/core/services/utility.service';

@Component({
  selector: 'app-choose-lesson-plan',
  templateUrl: './choose-lesson-plan.component.html',
  styleUrls: ['./choose-lesson-plan.component.scss']
})
export class ChooseLessonPlanComponent implements OnInit{

  tableHeaders = ['Board','Medium','Class', 'Subject', 'Chapter','Sub-Topic'];
  lessonPlanData: any[]=[];
  
  formvalues:any = {};  

  constructor( private contentGenService:ContentGenerationService, private router:Router, private utilityService:UtilityService){}
  
  ngOnInit(): void {   
    this.formvalues = this.contentGenService.formfiltervalues;
    // impact multiple lesson plan - choose lesson plan
    // this.lessonPlanData = this.contentGenService.lessonPlanData;    
  }

  chooseLessonPlan(selectedLessonPlan:any){
    this.contentGenService.lessonPlanExists(selectedLessonPlan._id).subscribe({
      next:(res:any)=>{
        if(res.choose){
          this.contentGenService.selectedLessonPlan = selectedLessonPlan;    
          this.router.navigate(['/user/content-generation/inspect-lesson-plan']);
        }
      },
      error:(err)=>{        
        if(err.status === 404 && !err.choose){
          this.utilityService.showWarning('Selected Lesson Plan already exists!');
        }
      }
    });    
  }

}
