import { Component, OnInit, inject } from '@angular/core';
import { FlnResourceService } from './fln-resource.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { environment } from 'src/environments/environment';

interface Lesson {
  day: number;
  grade: string;
  learning_outcome: string;
  concept: string;
  teaching_strategy: string;
  activity: string;
  assessment_questions: string[];
  practice_questions: string[];
  teacher_notes: string;
}

@Component({
  selector: 'app-fln-lessons',
  templateUrl: './fln-lessons.component.html',
  styleUrls: ['./fln-lessons.component.scss']
})
export class FlnLessonsComponent implements OnInit {
  grades: string[] = [];
  selectedGrade = '';
  days: number[] = [];
  selectedDay = 1;
  lesson: Lesson | null = null;
  loading = false;
  baseUrl = environment.apiUrl;
  

  private flnService = inject(FlnResourceService);
  private authService = inject(AuthService);

  ngOnInit() {
    this.flnService.getGrades().subscribe(grades => {
      this.grades = grades;
      this.authService.getFLNLastViewed().subscribe(lastViewed => {
        if (lastViewed && lastViewed.grade && grades.includes(lastViewed.grade)) {
          this.selectedGrade = lastViewed.grade;
          this.loadDays(lastViewed.day);
        } else {
          this.selectedGrade = grades[0];
          this.loadDays();
        }
      }, () => {
        // fallback if API fails
        this.selectedGrade = grades[0];
        this.loadDays();
      });
    });
  }

  loadDays(dayToSelect?: number) {
    this.flnService.getDays(this.selectedGrade).subscribe(days => {
      this.days = days;
      if (dayToSelect && days.includes(dayToSelect)) {
        this.selectedDay = dayToSelect;
      } else {
        this.selectedDay = days[0];
      }
      this.loadLesson();
    });
  }

  loadLesson() {
    this.loading = true;
    this.flnService.getLesson(this.selectedGrade, this.selectedDay).subscribe(lesson => {
      this.lesson = lesson;
      this.loading = false;
      this.authService.setFLNLastViewed(this.selectedGrade, this.selectedDay).subscribe();
    }, () => this.loading = false);
  }

  onGradeChange() {
    this.loadDays();
  }

  prevDay() {
    const idx = this.days.indexOf(this.selectedDay);
    if (idx > 0) {
      this.selectedDay = this.days[idx - 1];
      this.loadLesson();
    }
  }

  nextDay() {
    const idx = this.days.indexOf(this.selectedDay);
    if (idx < this.days.length - 1) {
      this.selectedDay = this.days[idx + 1];
      this.loadLesson();
    }
  }

  jumpToDay(day: number) {
    if (this.days.includes(day)) {
      this.selectedDay = day;
      this.loadLesson();
    }
  }

  downloadLesson() {
    if (!this.lesson) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.lesson, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `lesson_${this.selectedGrade}_day${this.selectedDay}.json`);
    dlAnchorElem.click();
  }

  downloadExcel() {
    const grade = this.selectedGrade;
    const url = `${this.baseUrl}/fln/export-excel?grade=${encodeURIComponent(grade)}`;
    window.open(url, '_blank');
  }
}
