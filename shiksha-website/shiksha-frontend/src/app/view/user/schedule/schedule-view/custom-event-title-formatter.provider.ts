import { LOCALE_ID, Inject, Injectable } from '@angular/core';
import { CalendarEventTitleFormatter, CalendarEvent } from 'angular-calendar';
import { formatDate } from '@angular/common';

@Injectable()
export class CustomEventTitleFormatter extends CalendarEventTitleFormatter {
  constructor(@Inject(LOCALE_ID) private locale: string) {
    super();
  }

	
  override week(event: CalendarEvent): string {
    return `<b>${formatDate(event.start, 'hh:mm a', this.locale)}</b> ${
      event.title
    } `;
  }

  override weekTooltip(event: CalendarEvent): string {
    return '';
  }

 
}
