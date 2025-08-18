import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CalendarView } from 'angular-calendar';

@Pipe({
  name: 'viewDateFormat',
  standalone: true,
})
export class ViewDateFormatPipe implements PipeTransform {
  private datePipe = new DatePipe('es');

  transform(date: Date, view: CalendarView): string {
    switch (view) {
      case CalendarView.Day: {
        return this.datePipe.transform(date, 'fullDate')!;
      }
      case CalendarView.Week: {
        const start = new Date(date);
        const day = start.getDay();
        const diff = (day + 6) % 7; // adjust so Monday is start of week
        start.setDate(start.getDate() - diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const startStr = this.datePipe.transform(start, 'd MMM')!;
        const endStr = this.datePipe.transform(end, 'd MMM yyyy')!;
        return `${startStr} - ${endStr}`;
      }
      case CalendarView.Month: {
        return this.datePipe.transform(date, 'MMMM yyyy')!;
      }
      default:
        return this.datePipe.transform(date, 'fullDate')!;
    }
  }
}
