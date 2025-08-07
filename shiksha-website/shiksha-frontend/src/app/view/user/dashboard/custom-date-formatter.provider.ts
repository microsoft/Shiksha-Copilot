import {
  CalendarDateFormatter,
  DateAdapter,
  DateFormatterParams,
} from 'angular-calendar';
import { formatDate } from '@angular/common';
import { Inject, Injectable, LOCALE_ID } from '@angular/core';

@Injectable()
export class CustomDateFormatter extends CalendarDateFormatter {
  /**
   * Class constructor
   * @param locale string
   * @param dateAdapter DateAdapter
   */
  constructor(
    @Inject(LOCALE_ID) private locale: string,
    dateAdapter: DateAdapter
  ) {
    super(dateAdapter);
  }

  override monthViewColumnHeader({ date }: DateFormatterParams): string {
    return formatDate(date, 'EEE', this.locale);
  }

  override dayViewHour({ date }: DateFormatterParams): string {
    return formatDate(date, 'hh:mm a', this.locale);
  }
}
