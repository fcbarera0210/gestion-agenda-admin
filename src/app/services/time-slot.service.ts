import { Injectable } from '@angular/core';
import { formatDate } from '@angular/common';
import { addDays, addMinutes, parseISO, setHours, setMinutes, areIntervalsOverlapping } from 'date-fns';

import { WorkSchedule, DaySchedule } from './settings-service';
import { Appointment } from './appointments-service';
import { TimeBlock } from './time-block-service';

@Injectable({
  providedIn: 'root'
})
export class TimeSlotService {
  getAvailableDates(workSchedule: WorkSchedule | null, startDate?: Date): string[] {
    const dates: string[] = [];
    if (workSchedule) {
      const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const today = new Date();
      for (let i = 0; i < 21; i++) {
        const date = addDays(today, i);
        const dayName = daysOfWeek[date.getDay()];
        const daySchedule = workSchedule[dayName];
        if (daySchedule && daySchedule.isActive) {
          dates.push(formatDate(date, 'yyyy-MM-dd', 'en-US'));
        }
      }
    }
    if (startDate) {
      const startStr = formatDate(startDate, 'yyyy-MM-dd', 'en-US');
      if (!dates.includes(startStr)) {
        dates.push(startStr);
        dates.sort();
      }
    }
    return dates;
  }

  getAvailableTimes(options: {
    date: string;
    duration: number;
    workSchedule: WorkSchedule | null;
    appointments: Appointment[];
    timeBlocks: TimeBlock[];
    startTime?: string;
    excludeAppointmentId?: string;
    excludeBlockId?: string;
  }): string[] {
    const {
      date,
      duration,
      workSchedule,
      appointments,
      timeBlocks,
      startTime,
      excludeAppointmentId,
      excludeBlockId
    } = options;

    const times: string[] = [];
    if (!workSchedule) {
      return times;
    }

    const baseDate = parseISO(`${date}T00:00:00`);
    const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][baseDate.getDay()];
    const daySchedule = workSchedule[dayName];
    if (!daySchedule || !daySchedule.isActive) {
      return times;
    }

    if (startTime) {
      const start = parseISO(`${date}T${startTime}`);
      const [endHour, endMinute] = daySchedule.workHours.end.split(':').map(Number);
      const workEnd = setMinutes(setHours(baseDate, endHour), endMinute);
      let slotEnd = addMinutes(start, duration);
      while (
        slotEnd <= workEnd &&
        this.isIntervalAvailable(start, slotEnd, daySchedule, appointments, timeBlocks, excludeAppointmentId, excludeBlockId)
      ) {
        times.push(formatDate(slotEnd, 'HH:mm', 'en-US'));
        slotEnd = addMinutes(slotEnd, duration);
      }
    } else {
      const [startHour, startMinute] = daySchedule.workHours.start.split(':').map(Number);
      const [endHour, endMinute] = daySchedule.workHours.end.split(':').map(Number);
      let slotStart = setMinutes(setHours(baseDate, startHour), startMinute);
      const workEnd = setMinutes(setHours(baseDate, endHour), endMinute);
      while (addMinutes(slotStart, duration) <= workEnd) {
        const slotEnd = addMinutes(slotStart, duration);
        if (
          this.isIntervalAvailable(slotStart, slotEnd, daySchedule, appointments, timeBlocks, excludeAppointmentId, excludeBlockId)
        ) {
          times.push(formatDate(slotStart, 'HH:mm', 'en-US'));
        }
        slotStart = addMinutes(slotStart, 30);
      }
    }

    return times;
  }

  isIntervalAvailable(
    start: Date,
    end: Date,
    daySchedule: DaySchedule,
    appointments: Appointment[],
    timeBlocks: TimeBlock[],
    excludeAppointmentId?: string,
    excludeBlockId?: string
  ): boolean {
    const interval = { start, end };

    if (daySchedule.breaks) {
      for (const brk of daySchedule.breaks) {
        const [bsHour, bsMinute] = brk.start.split(':').map(Number);
        const [beHour, beMinute] = brk.end.split(':').map(Number);
        const breakStart = setMinutes(setHours(new Date(start), bsHour), bsMinute);
        const breakEnd = setMinutes(setHours(new Date(start), beHour), beMinute);
        if (areIntervalsOverlapping(interval, { start: breakStart, end: breakEnd })) {
          return false;
        }
      }
    }

    for (const apt of appointments) {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) continue;
      const aptStart = apt.start.toDate();
      const aptEnd = apt.end.toDate();
      if (
        formatDate(aptStart, 'yyyy-MM-dd', 'en-US') === formatDate(start, 'yyyy-MM-dd', 'en-US') &&
        areIntervalsOverlapping(interval, { start: aptStart, end: aptEnd })
      ) {
        return false;
      }
    }

    for (const block of timeBlocks) {
      if (excludeBlockId && block.id === excludeBlockId) continue;
      const blockStart = block.start.toDate();
      const blockEnd = block.end.toDate();
      if (
        formatDate(blockStart, 'yyyy-MM-dd', 'en-US') === formatDate(start, 'yyyy-MM-dd', 'en-US') &&
        areIntervalsOverlapping(interval, { start: blockStart, end: blockEnd })
      ) {
        return false;
      }
    }

    return true;
  }
}

