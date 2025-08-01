import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  CalendarEvent,
  CalendarEventAction,
  CalendarEventTimesChangedEvent,
  CalendarView,
  CalendarEventTitleFormatter,
} from 'angular-calendar';
import { startOfMinute } from 'date-fns';
import { Subject } from 'rxjs';
import { CustomEventTitleFormatter } from './custom-event-title-formatter.provider';

import { ScheduleService } from '../schedule.service';
import { DatePipe } from '@angular/common';
import { UtilityService } from 'src/app/core/services/utility.service';
import { colors } from 'src/app/shared/utility/scheduleClassColors.util';
import { Router } from '@angular/router';

@Component({
  selector: 'app-schedule-view',
  templateUrl: './schedule-view.component.html',
  styleUrls: ['./schedule-view.component.scss'],
  providers: [
    {
      provide: CalendarEventTitleFormatter,
      useClass: CustomEventTitleFormatter,
    },
    DatePipe,
  ],
})
export class ScheduleViewComponent implements OnInit,AfterViewInit {
  displayDate!: string;
  daysInWeek: string[] = [];
  // weekDays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  cordinate!: any;
  showPopUp: boolean = false;
  mode!: string;
  dateRange: any;

  title = 'Lesson Name:Electricity and Circuits';
  class = 6;
  section = 'A';
  subject = 'Sceince';
  events: CalendarEvent[] = [];
  selectedEvent: any;
  showDelete!: boolean;
  activeDayIsOpen: boolean = true;

  startDate: any;
  endDate: any;
  previousStartDate!: any;
  previousEndDate!: any;
  teacherId!: string;
  viewOnly = false;
  cellData:any;
  teacherSchedule = true;

  constructor(
    private service: ScheduleService,
    private utility: UtilityService,
    private datePipe: DatePipe,
    private router:Router
    
  ) {}

  // @ViewChild('modalContent', { static: true }) modalContent!: TemplateRef<any>;
  // @ViewChild('calender_ele') calender_ele!: TemplateRef<any>;
  @ViewChild('tooltip_modal') tooltip !: ElementRef<any>;
  view: CalendarView = CalendarView.Week;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  // exclude weekends
  excludeDays: number[] = [0, 7];
  modalData!: {
    action: string;
    event: CalendarEvent;
  };

  actions: CalendarEventAction[] = [
    {
      label: '<i class="fas fa-fw fa-pencil-alt"></i>',
      a11yLabel: 'Edit',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        this.handleEvent('Edited', event);
      },
    },
    {
      label: '<i class="fas fa-fw fa-trash-alt"></i>',
      a11yLabel: 'Delete',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        this.events = this.events.filter((iEvent) => iEvent !== event);
        this.handleEvent('Deleted', event);
      },
    },
  ];

  eventsData: any[] = [];

  refresh = new Subject<void>();

  @ViewChild('scrollableElement') scrollableElement!: ElementRef;

  ngAfterViewInit(): void {
    this.scrollableElement.nativeElement.addEventListener('scroll', ()=>{
      this.tooltip.nativeElement.style.display='none'
    });
  }

  ngOnInit(): void {
    this.previousStartDate = '';
    this.previousEndDate = '';
    const userData = localStorage.getItem('userData'); //user data for teacher id and school id
    if (userData) {
      const parsedUserData = JSON.parse(userData);
      this.teacherId = parsedUserData._id;
    }
  }

  beforeViewRender(evenValue: any) {
    const newstartDate = this.datePipe.transform(
      evenValue.period.start,
      'yyyy-MM-dd'
    );
    const newendDate = this.datePipe.transform(
      evenValue.period.end,
      'yyyy-MM-dd'
    );
    if (
      newstartDate !== this.previousStartDate ||
      newendDate !== this.previousEndDate
    ) {
      this.startDate = newstartDate;
      this.endDate = newendDate;

      // Update previous dates
      this.previousStartDate = newstartDate;
      this.previousEndDate = newendDate;

      // Make the API call
      this.getAllDetails(this.startDate, this.endDate);
    }
  }

  /**
   * Function triggered on schedule type change
   * @param val 
   */
  scheduleTypeChange(val:boolean){
    this.teacherSchedule = val;
    this.getAllDetails(this.startDate, this.endDate);
  }

  getAllDetails(startDate: any, endDate: any) {
    this.service.getAllSchedule(startDate, endDate,this.teacherSchedule).subscribe({
      next: (res: any) => {
        this.eventsData = res.data;
        this.CreateEvent(this.eventsData);
        this.refresh.next();
      },
    });
  }

  handleEvent(action: string, event: any, ele: any = null): void {
    this.modalData = { event, action };
    this.selectedEvent = event.event;

    if (this.selectedEvent.event.meta.teacherId !== this.teacherId) {
      this.viewOnly = true;
    } else {
      this.viewOnly = false;
    }
    let parentElement;

    if (event?.sourceEvent) {
      parentElement = event.sourceEvent?.parentNode;
    }
    this.placeTooltip(ele, parentElement);
    this.sendCordinate(parentElement);
    this.closeDialogue();
  }

  CreateEvent(eventsData: any) {
    this.events = [];
    for (let events of eventsData) {
      let index = 0;
      for (let scheduleItem of events.scheduleDateTime) {
        this.events.push(
          this.setEventData(
            events,
            this.utility.formateDate(scheduleItem),
            index
          )
        );
        index++;
      }
    }
  }

  getEventColor(key: number) {
    return colors.get(key) || { primary: '#000000', secondary: '#FFFFFF' }; // Default to black/white if key not found
  }

  setEventData(eventVal: any, date_time: any, index: number) {
    const [year, month, day] = date_time.date.split('-').map(Number);
    const [fromHour, fromMinute] = date_time.fromTime.split(':').map(Number);
    const [toHour, toMinute] = date_time.toTime.split(':').map(Number);
    const eventColor = this.getEventColor(eventVal.class);



    return {
      start: startOfMinute(
        new Date(year, month - 1, day, fromHour, fromMinute, 0)
      ),
      end: startOfMinute(new Date(year, month - 1, day, toHour, toMinute, 0)),
      title: 'Schedule View',
      color: eventColor,
      actions: this.actions,
      id: eventVal._id,
      meta: {
        index: index,
        class: eventVal.class,
        section: eventVal.section,
        subject: this.utility.getSubjectDisplayName(eventVal.lesson.subjects),
        date: date_time.date,
        lessonId: this.title,
        schdule_id: date_time._id,
        teacherId: eventVal.teacherId,
        events: eventVal,
      },

      draggable: false,
      resizable: {
        beforeStart: false,
        afterEnd: false,
      },
    };
  }

  navigateLessonPlan(toolTip:any){
    this.router.navigate(['user/content-generation/lesson-plan',this.selectedEvent.event.meta.events.lessonId]);
    toolTip.style.display = 'none';
  }

  viewSchedule(toolTip: any) {
    toolTip.style.display = 'none';
    this.mode = 'view';
    this.showPopUp = true;
  }

  editSchedule(toolTip: any) {
    toolTip.style.display = 'none';
    this.mode = 'edit';
    this.showPopUp = true;
  }

  openModalForDeleteConfirm(toolTip: any) {
    toolTip.style.display = 'none';
    this.showDelete = true;
  }

  eventTimesChanged({
    event,
    newStart,
    newEnd,
  }: CalendarEventTimesChangedEvent): void {
    this.events = this.events.map((iEvent) => {
      if (iEvent === event) {
        return {
          ...event,
          start: newStart,
          end: newEnd,
        };
      }
      return iEvent;
    });
   
    

  }

  handleCustomClick(event: any, calendarEvent: any, ele: any) {
    event.stopPropagation();
    event.preventDefault();
    this.handleEvent('clicked', calendarEvent, ele);
  }

  /**
   * triggered when empty slot clicked on the calendar 
   * remove the tooltip if it is opened and return
   * formatted the date and time and set this to the celldata variable which will be passed to the modal
   * 
   * @param mouseEvent 
   * @param toolTip 
   * @returns 
   */
  onEmptySlotClicked(mouseEvent: any,toolTip:any) {
    // hide create in all schedule 
    if(!this.teacherSchedule){
      return
    }

    // if tooltip already open then just close the tooltip and return
    if(toolTip.style.display === "flex"){
      toolTip.style.display = 'none';
      return
    }

    const date = mouseEvent.date;
    this.formateCellDate(date);

    
    
    let parentElement;
    if (mouseEvent.sourceEvent?.srcElement) {
      parentElement = mouseEvent.sourceEvent.srcElement.parentNode;
    }

    this.setScheduleData('cellClick',parentElement);
    this.closeDialogue();

  }


  formateCellDate(date:any){
// Extract date parts
  let day = date.getDate();
  let month = date.getMonth() + 1; // Months are zero-based
  let year = date.getFullYear();

  if(day<10){
    day = `0${day}`;
  }
  if(month<10){
    month = `0${month}`;
  }


  // Extract time parts
  let hours = date.getHours();
  let min = date.getMinutes();
  if(min>0){
    hours+= 1;
  }
  let EndHour = hours + 1;
  
  if(hours<10){
    hours = `0${hours}`;
  }
  if(EndHour < 10){
    EndHour = `0${EndHour}`
  }

  // Format date and time as needed
  const formattedDate = `${year}-${month}-${day}`;
  const formattedTime = `${hours}:00`;
  const formatedEndHour =`${EndHour}:00` ;

  this.cellData = {
    date:formattedDate,
    time:formattedTime,
    EndHour:formatedEndHour
  }
}

 

  deleteEvent(eventToDelete: CalendarEvent) {
    this.events = this.events.filter((event) => event !== eventToDelete);
  }

  closeOpenMonthViewDay() {
    this.activeDayIsOpen = false;
  }

  /**
   * get the cordinates of the passed element and set that to cordinate variable to send to the modal
   * @param ele 
   */
  sendCordinate(ele: HTMLElement) {
    const rect = ele.getBoundingClientRect();
    this.cordinate = {
      rect: rect,
      element: ele,
    };
  }

  placeTooltip(ele: any, parentElement: HTMLElement) {
    ele.style.transform = 'translateY(0%)'
    ele.style.display = 'flex';
    const rect = parentElement.getBoundingClientRect();

    const vw = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0
    );
    const vh = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );

    ele.style.left = `${rect.left + parentElement.offsetWidth}px`;
    ele.style.top = `${rect.top + parentElement.offsetHeight}px`;

    // handling right intersection
    if (rect.right + ele.offsetWidth > vw) {
      ele.style.left = `${rect.left - ele.offsetWidth}px`;
    }

    if(rect.top - ele.offsetHeight < 0){
      ele.style.top = `${rect.bottom}`;
    }
    // handling bottom intersection
    if (rect.bottom + ele.offsetHeight > vh) {
      ele.style.top = ` ${rect.top - ele.offsetHeight}px`;
    }

    if(rect.top - ele.offsetHeight < 0 && rect.bottom + ele.offsetHeight > vh){
      ele.style.top='50%';
      ele.style.transform = 'translateY(-50%)'
    }
  }

  onAddClick(ele: HTMLElement) {
    const date = new Date();
    this.formateCellDate(date)
    this.setScheduleData('create',ele);
  }

  closeDialogue() {
    const dialogueEle = document.getElementById('dialogue');
    window.addEventListener('click', (event) => {
      if (dialogueEle) {
        const rectVal = dialogueEle?.getBoundingClientRect();
        const isInDialog =
          rectVal.top <= event.clientY &&
          event.clientY <= rectVal.top + rectVal.height &&
          rectVal.left <= event.clientX &&
          event.clientX <= rectVal.left + rectVal.width;
        if (!isInDialog) {
          dialogueEle.style.display = 'none';
        }
      }
    });
  }

  closeDelete(value: string) {
    if (value === 'delete') {
      this.service
        .deleteSchedule(
          this.selectedEvent.event.id,
          this.selectedEvent.event.meta.schdule_id
        )
        .subscribe({
          next: (val: any) => {
            this.utility.showSuccess('Successfully Deleted');
            this.getAllDetails(this.startDate, this.endDate);
          },
          error: (err) => {
            this.utility.handleError(err);
          },
        });
    }
    this.showDelete = false;
  }

  onClosePopUp(event: any) {
    if (event === 'save') {
      this.getAllDetails(this.startDate, this.endDate); //reset the event data
    }
    this.showPopUp = false;
  }

  setScheduleData(eventName:string,ele:any){
    this.selectedEvent = null;
    this.sendCordinate(ele);
    //we don't send the date and time when opening create pop up while clicking create button
    // if(eventName === 'create'){
    //   this.cellData = null;
    // }
    this.mode = 'add';
    this.showPopUp = true;
  }

  
}
