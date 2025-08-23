import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { addMinutes, parseISO, addDays, setHours, setMinutes, areIntervalsOverlapping } from 'date-fns';
import { combineLatest } from 'rxjs';

import { Appointment, AppointmentsService } from '../../services/appointments-service';
import { TimeBlock, TimeBlockService } from '../../services/time-block-service';
import { SettingsService, WorkSchedule, DaySchedule } from '../../services/settings-service';

@Component({
  selector: 'app-block-time-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './block-time-modal.html',
})
export class BlockTimeModalComponent implements OnInit {
  @Input() startDate!: Date;
  @Input('timeBlock') block: TimeBlock | null = null;
  @Output() onSave = new EventEmitter<TimeBlock>();
  @Output() onCancel = new EventEmitter<void>();

  blockForm: FormGroup;
  isLoading = false;

  availableDates: string[] = [];
  availableStartTimes: string[] = [];
  availableEndTimes: string[] = [];
  workSchedule: WorkSchedule | null = null;
  appointments: Appointment[] = [];
  timeBlocks: TimeBlock[] = [];

  constructor(
    private fb: FormBuilder,
    private appointmentsService: AppointmentsService,
    private timeBlockService: TimeBlockService,
    private settingsService: SettingsService
  ) {
    this.blockForm = this.fb.group({
      motivo: [''],
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.blockForm.get('date')?.valueChanges.subscribe(date => {
      if (date) {
        this.generateAvailableStartTimes(date);
        this.blockForm.get('startTime')?.setValue('');
        this.availableEndTimes = [];
      }
    });
    this.blockForm.get('startTime')?.valueChanges.subscribe(time => {
      const date = this.blockForm.get('date')?.value;
      if (time && date) {
        this.generateAvailableEndTimes(date, time);
      } else {
        this.availableEndTimes = [];
      }
    });
  }

  private loadData(): void {
    combineLatest([
      this.settingsService.getProfessionalProfile(),
      this.appointmentsService.getAppointments(),
      this.timeBlockService.getTimeBlocks()
    ]).subscribe(([profile, appointments, blocks]) => {
      this.workSchedule = profile?.workSchedule || null;
      this.appointments = appointments;
      this.timeBlocks = this.block ? blocks.filter(b => b.id !== this.block!.id) : blocks;
      this.generateAvailableDates();

      if (this.block) {
        const blockStart = this.block.start.toDate();
        const blockEnd = this.block.end.toDate();
        const dateStr = formatDate(blockStart, 'yyyy-MM-dd', 'en-US');
        const startStr = formatDate(blockStart, 'HH:mm', 'en-US');
        const endStr = formatDate(blockEnd, 'HH:mm', 'en-US');
        this.generateAvailableStartTimes(dateStr);
        this.generateAvailableEndTimes(dateStr, startStr);
        this.blockForm.patchValue({
          date: dateStr,
          startTime: startStr,
          endTime: endStr,
          motivo: this.block.title !== 'Horario Bloqueado' ? this.block.title : '',
        }, { emitEvent: false });
      } else {
        const dateStr = formatDate(this.startDate, 'yyyy-MM-dd', 'en-US');
        const startStr = formatDate(this.startDate, 'HH:mm', 'en-US');
        const endStr = formatDate(addMinutes(this.startDate, 30), 'HH:mm', 'en-US');
        this.generateAvailableStartTimes(dateStr);
        this.generateAvailableEndTimes(dateStr, startStr);
        this.blockForm.patchValue({
          date: dateStr,
          startTime: startStr,
          endTime: endStr,
        }, { emitEvent: false });
      }
    });
  }

  private generateAvailableDates(): void {
    this.availableDates = [];
    if (!this.workSchedule) {
      const startDateStr = formatDate(this.startDate, 'yyyy-MM-dd', 'en-US');
      this.availableDates.push(startDateStr);
      return;
    }
    const daysToCheck = 30;
    for (let i = 0; i < daysToCheck; i++) {
      const date = addDays(this.startDate, i);
      const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
      const daySchedule = this.workSchedule[weekday];
      if (daySchedule?.isActive) {
        const dateStr = formatDate(date, 'yyyy-MM-dd', 'en-US');
        this.availableDates.push(dateStr);
      }
    }
  }

  private generateAvailableStartTimes(dateStr: string): void {
    this.availableStartTimes = [];
    if (!this.workSchedule) return;

    const date = new Date(dateStr + 'T00:00');
    const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
    const daySchedule = this.workSchedule[weekday];
    if (!daySchedule || !daySchedule.isActive) return;

    const [startHour, startMinute] = daySchedule.workHours.start.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.workHours.end.split(':').map(Number);
    let current = setMinutes(setHours(new Date(date), startHour), startMinute);
    const end = setMinutes(setHours(new Date(date), endHour), endMinute);

    while (current < end) {
      if (this.isTimeSlotAvailable(current, addMinutes(current, 30), daySchedule)) {
        this.availableStartTimes.push(formatDate(current, 'HH:mm', 'en-US'));
      }
      current = addMinutes(current, 30);
    }
  }

  private generateAvailableEndTimes(dateStr: string, startTimeStr: string): void {
    this.availableEndTimes = [];
    if (!this.workSchedule) return;

    const date = new Date(dateStr + 'T00:00');
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const start = setMinutes(setHours(new Date(date), startHour), startMinute);

    const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
    const daySchedule = this.workSchedule[weekday];
    if (!daySchedule || !daySchedule.isActive) return;

    const [endHour, endMinute] = daySchedule.workHours.end.split(':').map(Number);
    let current = addMinutes(start, 30);
    const end = setMinutes(setHours(new Date(date), endHour), endMinute);

    while (current <= end) {
      if (this.isTimeSlotAvailable(start, current, daySchedule)) {
        this.availableEndTimes.push(formatDate(current, 'HH:mm', 'en-US'));
      }
      current = addMinutes(current, 30);
    }
  }

  private isTimeSlotAvailable(start: Date, end: Date, daySchedule: DaySchedule): boolean {
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

    for (const apt of this.appointments) {
      const aptStart = apt.start.toDate();
      const aptEnd = apt.end.toDate();
      if (formatDate(aptStart, 'yyyy-MM-dd', 'en-US') === formatDate(start, 'yyyy-MM-dd', 'en-US')) {
        if (areIntervalsOverlapping(interval, { start: aptStart, end: aptEnd })) {
          return false;
        }
      }
    }

    for (const block of this.timeBlocks) {
      const blockStart = block.start.toDate();
      const blockEnd = block.end.toDate();
      if (formatDate(blockStart, 'yyyy-MM-dd', 'en-US') === formatDate(start, 'yyyy-MM-dd', 'en-US')) {
        if (areIntervalsOverlapping(interval, { start: blockStart, end: blockEnd })) {
          return false;
        }
      }
    }

    return true;
  }

  onDateChange(date: string): void {
    this.generateAvailableStartTimes(date);
  }

  onStartTimeChange(time: string): void {
    const date = this.blockForm.get('date')?.value;
    if (date) {
      this.generateAvailableEndTimes(date, time);
    }
  }

  save(): void {
    if (this.blockForm.invalid) return;
    this.isLoading = true;
    const formValue = this.blockForm.value;
    const startDate = parseISO(`${formValue.date}T${formValue.startTime}`);
    const endDate = parseISO(`${formValue.date}T${formValue.endTime}`);

    const blockData: TimeBlock = {
      id: this.block?.id,
      title: formValue.motivo || 'Horario Bloqueado',
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      color: { primary: '#6c757d', secondary: '#e9ecef' },
    } as TimeBlock;

    this.onSave.emit(blockData);
    this.isLoading = false;
  }

  cancel(): void {
    this.onCancel.emit();
  }
}

