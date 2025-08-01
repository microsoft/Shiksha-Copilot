import { Injectable } from '@angular/core';

interface Timer {
  interval: any;
  startTime: number;
  elapsedTime: number;
  isPaused: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TimerService {
  private timers: { [name: string]: Timer } = {};

  constructor() {}

  startTimer(name: string): void {
    if (!this.timers[name]) {
      this.timers[name] = {
        interval: null,
        startTime: 0,
        elapsedTime: 0,
        isPaused: true,
      };
    }
    const timer = this.timers[name];

    if (timer.isPaused) {
      timer.startTime = Date.now() - timer.elapsedTime;
      timer.interval = setInterval(() => {
        timer.elapsedTime = Date.now() - timer.startTime;
      }, 100);
      timer.isPaused = false;
    }
  }

  pauseTimer(name: string): void {
    const timer = this.timers[name];
    if (timer && !timer.isPaused) {
      clearInterval(timer.interval);
      timer.isPaused = true;
    }
  }

  resumeTimer(name: string): void {
    this.startTimer(name);
  }

  resetTimer(name: string): void {
    const timer = this.timers[name];
    if (timer) {
      clearInterval(timer.interval);
      timer.elapsedTime = 0;
      timer.isPaused = true;
    }
  }

  getCurrentTime(name: string): number {
    const timer = this.timers[name];
    return timer ? timer.elapsedTime / 1000 : 0;
  }
}
