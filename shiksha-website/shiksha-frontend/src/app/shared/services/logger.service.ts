import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private logLevel: LogLevel = environment.production ? LogLevel.ERROR : LogLevel.DEBUG;

  constructor() {}

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  debug(message: any, ...optionalParams: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(message, ...optionalParams);
    }
  }

  info(message: any, ...optionalParams: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(message, ...optionalParams);
    }
  }

  warn(message: any, ...optionalParams: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(message, ...optionalParams);
    }
  }

  error(message: any, ...optionalParams: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(message, ...optionalParams);
    }
  }

  // Method to set log level programmatically if needed
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}