import {
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DashboardService } from './dashboard.service';
import { ContentGenerationService } from '../content-generation/content-generation.service';
import { Router } from '@angular/router';
import { UtilityService } from 'src/app/core/services/utility.service';
import {
  CalendarDateFormatter,
  CalendarEvent,
  CalendarMonthViewDay,
  CalendarView,
} from 'angular-calendar';
import { CustomDateFormatter } from './custom-date-formatter.provider';
import { startOfMinute } from 'date-fns';
import { dashboardColors } from 'src/app/shared/utility/scheduleClassColors.util';
import { Subject } from 'rxjs';
import { DatePipe } from '@angular/common';
import { ChartOptions } from 'chart.js';
import { TranslateService } from '@ngx-translate/core';
import { DropDownConfig } from 'src/app/shared/interfaces/dropdown.interface';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  providers: [
    {
      provide: CalendarDateFormatter,
      useClass: CustomDateFormatter,
    },
  ],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('analyticsDropdown') analyticsDropdown: any;

  selectedAnalytics = 'quarter-year';

  analyticsDropdownOptions: any[] = [
    { name: '3 Months', value: 'quarter-year' },
    { name: '6 Months', value: ' half-year' },
    { name: 'Last year', value: 'last-year' },
    { name: 'Current year', value: 'current-year' },
  ];

  analyticsDropdownconfig: DropDownConfig = {
    isBackground: true,
    placeHolderTxt: 'Select duration',
    height: 'auto',
    bindLabel: 'name',
    bindValue: 'value',
    clearableOff: true,
  };

  recentLessonPlans: any[] = [];

  recentResoucePlans: any[] = [];

  recentPlans: any[] = [];

  resourceColors: any = {
    lesson: {
      iconColor: 'var(--tertiary-100)',
      btnColor: 'bg-tertiary-100',
      iconBackground: 'bg-purple-100',
    },
    resource: {
      iconColor: 'var(--success-80)',
      btnColor: 'bg-success-80',
      iconBackground: 'bg-green-100',
    },
  };

  viewDate: Date = new Date();

  monthViewDate: Date = new Date();

  activeDayIsOpen: boolean = true;

  view: CalendarView = CalendarView.Month;

  events: CalendarEvent[] = [];

  refresh = new Subject<void>();

  selectedDay: any;

  currentDay!: boolean;

  activeDate: any;

  lineChartData: any;

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        align: 'end',
      },
      tooltip: {
        backgroundColor: 'white',
        bodyColor: 'black',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        boxHeight: 10,
        bodyAlign: 'center',
        titleColor: 'black',
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        suggestedMin: 0,
        suggestedMax: 50,
        ticks: {
          stepSize: 5,
        },
        grid: {
          drawBorder: false,
        },
      },
    },
  };

  /**
   * Class constructor
   * @param dashboardService DashboardService
   * @param contentGenService ContentGenerationService
   * @param router Router
   * @param utiltyService UtilityService
   * @param datePipe DatePipe
   * @param translateService TranslateService
   */
  constructor(
    private dashboardService: DashboardService,
    private contentGenService: ContentGenerationService,
    private router: Router,
    public utiltyService: UtilityService,
    private datePipe: DatePipe,
    private translateService: TranslateService,
  ) {}

  /**
   * Angular oninit lifecycle hook for initialization
   */
  ngOnInit(): void {
    this.getRecentLessonPlan();
    this.getScheduleData(this.datePipe.transform(this.viewDate, 'yyyy-MM-dd'));
    this.getChartData(this.selectedAnalytics);
  }

  /**
   * Angular ngAfterViewInit lifecycle hook used to set default filter value
   */
  ngAfterViewInit(): void {
    this.analyticsDropdown.selectedItem = this.selectedAnalytics;
  }

  /**
   * Function to get recent lesson plan
   */
  getRecentLessonPlan() {
    this.dashboardService.getRecentLessonPlan().subscribe({
      next: (val) => {
        const response = val.data;
        let lessonObj;
        let resourceObj;
        let plans = [];
        this.recentLessonPlans = response.filter((ele: any) => ele.isLesson);
        this.recentResoucePlans = response.filter((ele: any) => !ele.isLesson);

        if (this.recentLessonPlans.length) {
          lessonObj = {
            ...this.recentLessonPlans[0],
            ...this.resourceColors['lesson'],
          };
          plans.push(lessonObj);
        }
        if (this.recentResoucePlans.length) {
          resourceObj = {
            ...this.recentResoucePlans[0],
            ...this.resourceColors['resource'],
          };
          plans.push(resourceObj);
        }
        this.recentPlans = [...plans];
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  /**
   * Function called on analytics filter change
   * @param val
   */
  onFilterChange(val: any) {
    this.selectedAnalytics = val;
    this.getChartData(this.selectedAnalytics);
  }

  /**
   * Function to get chart data
   */
  getChartData(filterParam: any) {
    this.dashboardService.getChartData(filterParam).subscribe({
      next: (val) => {
        this.lineChartData = {
          labels: val.timeLine,
          datasets: [
            {
              data: val.lessonPlanCounts,
              label: this.translateService.instant('Lesson Plans'),
              fill: false,
              borderColor: '#A062F7',
              tension: 0.3,
              cubicInterpolationMode: 'monotone',
              pointBackgroundColor: '#A062F7',
              backgroundColor: '#A062F7',
            },
            {
              data: val.resourcePlanCounts,
              label: this.translateService.instant('Lesson Resources'),
              fill: false,
              borderColor: '#70CF97',
              tension: 0.3,
              cubicInterpolationMode: 'monotone',
              pointBackgroundColor: '#70CF97',
              backgroundColor: '#70CF97',
            }
          ],
        };
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  /**
   * Function called on view
   * @param data
   */
  onView(data: any) {
    if (data.isLesson) {
      this.router.navigate([`/user/content-generation/lesson-plan/${data.lesson._id}`]);
    } else {
      this.router.navigate([`/user/content-generation/resource-plan/${data.resource._id}`]);
    }
  }

  /**
   * Function called on day clicked on calender
   * @param day
   */
  dayClicked(day: CalendarMonthViewDay): void {
    this.getScheduleData(this.datePipe.transform(day.date, 'yyyy-MM-dd'));

    if (this.selectedDay?.cssClass) {
      delete this.selectedDay.cssClass;
    }

    if (
      this.datePipe.transform(day.date, 'yyyy-MM-dd') ===
      this.datePipe.transform(new Date(), 'yyyy-MM-dd')
    ) {
      this.currentDay = false;
    } else {
      this.currentDay = true;
    }
    day.cssClass = 'cal-day-selected';
    this.selectedDay = day;
    this.viewDate = new Date(day.date);
  }

  /**
   * Function to get schedule data
   * @param date
   */
  getScheduleData(date: any) {
    this.dashboardService.getScheduleData(date).subscribe({
      next: (res) => {
        this.createEvent(res.data);
        this.refresh.next();
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  /**
   * Function to create events
   * @param eventsData
   */
  createEvent(eventsData: any) {
    this.events = [];
    for (let events of eventsData) {
      for (let scheduleItem of events.scheduleDateTime) {
        this.events.push(
          this.setEventData(
            events,
            this.utiltyService.formateDate(scheduleItem)
          )
        );
      }
    }
  }

  /**
   * Function to set event data
   * @param eventVal
   * @param date_time
   * @returns
   */
  setEventData(eventVal: any, date_time: any) {
    const [year, month, day] = date_time.date.split('-').map(Number);
    const [fromHour, fromMinute] = date_time.fromTime.split(':').map(Number);
    const [toHour, toMinute] = date_time.toTime.split(':').map(Number);
    const eventColor = this.getEventColor(eventVal.class);
    return {
      start: startOfMinute(
        new Date(year, month - 1, day, fromHour, fromMinute, 0)
      ),
      end: startOfMinute(new Date(year, month - 1, day, toHour, toMinute, 0)),
      title: `<span>${this.translateService.instant('Class')} : ${
        eventVal.class
      } | ${this.translateService.instant('Subject')} : ${
        this.utiltyService.getSubjectDisplayName(eventVal.subjects)
      }</span> <p class="cal-event-line2 overflow-hidden whitespace-nowrap text-ellipsis">${this.translateService.instant(
        'Lesson Name'
      )} : ${eventVal.topic}</p>`,
      color: eventColor,
      id: eventVal._id,
      draggable: false,
      resizable: {
        beforeStart: false,
        afterEnd: false,
      },
    };
  }

  /**
   * Function to get event colors based on subject
   * @param key
   * @returns
   */
  getEventColor(key: number) {
    return (
      dashboardColors.get(key) || { primary: '#000000', secondary: '#FFFFFF' }
    );
  }

  /**
   * Funciton called on viewDateChange
   */
  closeOpenMonthViewDay() {
    this.activeDayIsOpen = false;
  }

  getTooltip(event:any){
    return `${event.title} <p>Time: ${this.datePipe.transform(event.start,'hh:mm a')} to ${this.datePipe.transform(event.end,'hh:mm a')}</p>`
  }
}
