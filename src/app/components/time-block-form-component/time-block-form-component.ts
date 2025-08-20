import { Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { addMinutes, parseISO, addDays, setHours, setMinutes, areIntervalsOverlapping } from 'date-fns';
import { combineLatest } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';

import { Appointment, AppointmentsService } from '../../services/appointments-service';
import { TimeBlock, TimeBlockService } from '../../services/time-block-service';
import { SettingsService, WorkSchedule, DaySchedule } from '../../services/settings-service';
import { ConfirmationDialogComponent } from '../confirmation-dialog-component/confirmation-dialog-component';

@Component({
  selector: 'app-time-block-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmationDialogComponent],
  templateUrl: './time-block-form-component.html',
})
export class TimeBlockFormComponent implements OnInit, OnChanges {
  @Input() startDate!: Date;
  @Input() timeBlock: TimeBlock | null = null;
  @Input() isDeleting = false;
  @Input() onSave!: (blockData: TimeBlock) => Promise<any>;
  @Output() onDelete = new EventEmitter<string>();

  blockForm: FormGroup;
  isLoading = false;
  isEditMode = false;
  showConfirmationDialog = false;

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
    private settingsService: SettingsService,
    private dialogRef: MatDialogRef<TimeBlockFormComponent>,
  ) {
    this.blockForm = this.fb.group({
      title: ['Horario Bloqueado', Validators.required],
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

  ngOnChanges(changes: SimpleChanges): void {
    this.configureFormForMode();
  }

  private loadData(): void {
    combineLatest([
      this.settingsService.getProfessionalProfile(),
      this.appointmentsService.getAppointments(),
      this.timeBlockService.getTimeBlocks()
    ]).subscribe(([profile, appointments, blocks]) => {
      this.workSchedule = profile?.workSchedule || null;
      this.appointments = appointments;
      this.timeBlocks = blocks;
      this.generateAvailableDates();

      const dateControl = this.blockForm.get('date');
      if (dateControl && this.availableDates.length) {
        let selectedDate = dateControl.value as string;
        if (!selectedDate || !this.availableDates.includes(selectedDate)) {
          selectedDate = this.availableDates[0];
        }
        dateControl.setValue(selectedDate, { emitEvent: false });
      }
      const date = dateControl?.value as string | undefined;
      if (date) {
        this.generateAvailableStartTimes(date);
        const startControl = this.blockForm.get('startTime');
        let start = startControl?.value as string | undefined;
        if (!start || !this.availableStartTimes.includes(start)) {
          start = this.availableStartTimes[0];
          startControl?.setValue(start, { emitEvent: false });
        }
        if (start) {
          this.generateAvailableEndTimes(date, start);
          const endControl = this.blockForm.get('endTime');
          let end = endControl?.value as string | undefined;
          if (!end || !this.availableEndTimes.includes(end)) {
            end = this.availableEndTimes[0];
            endControl?.setValue(end, { emitEvent: false });
          }
        }
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
    const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const today = new Date();
    for (let i = 0; i < 21; i++) {
      const date = addDays(today, i);
      const dayName = daysOfWeek[date.getDay()];
      const daySchedule = this.workSchedule[dayName];
      if (daySchedule && daySchedule.isActive) {
        this.availableDates.push(formatDate(date, 'yyyy-MM-dd', 'en-US'));
      }
    }
    const startDateStr = formatDate(this.startDate, 'yyyy-MM-dd', 'en-US');
    if (!this.availableDates.includes(startDateStr)) {
      this.availableDates.push(startDateStr);
      this.availableDates.sort();
    }
  }

  private generateAvailableStartTimes(date: string): void {
    this.availableStartTimes = [];
    const baseDate = parseISO(`${date}T00:00:00`);
    if (this.workSchedule) {
      const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][baseDate.getDay()];
      const daySchedule = this.workSchedule[dayName];
      if (daySchedule && daySchedule.isActive) {
        const [startHour, startMinute] = daySchedule.workHours.start.split(':').map(Number);
        const [endHour, endMinute] = daySchedule.workHours.end.split(':').map(Number);
        let slotStart = setMinutes(setHours(baseDate, startHour), startMinute);
        const workEnd = setMinutes(setHours(baseDate, endHour), endMinute);

        while (addMinutes(slotStart, 30) <= workEnd) {
          const slotEnd = addMinutes(slotStart, 30);
          if (this.isIntervalAvailable(slotStart, slotEnd, daySchedule)) {
            this.availableStartTimes.push(formatDate(slotStart, 'HH:mm', 'en-US'));
          }
          slotStart = addMinutes(slotStart, 30);
        }
      }
    }

    let selectedStart = this.blockForm.get('startTime')?.value as string | undefined;
    if (!selectedStart && this.startDate && formatDate(this.startDate, 'yyyy-MM-dd', 'en-US') === date) {
      selectedStart = formatDate(this.startDate, 'HH:mm', 'en-US');
    }
    if (selectedStart && !this.availableStartTimes.includes(selectedStart)) {
      this.availableStartTimes.push(selectedStart);
      this.availableStartTimes.sort();
    }
  }

  private generateAvailableEndTimes(date: string, startTime: string): void {
    this.availableEndTimes = [];
    let daySchedule: DaySchedule | undefined;
    if (this.workSchedule) {
      const start = parseISO(`${date}T${startTime}`);
      const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][start.getDay()];
      daySchedule = this.workSchedule[dayName];
      if (daySchedule && daySchedule.isActive) {
        const [endHour, endMinute] = daySchedule.workHours.end.split(':').map(Number);
        const workEnd = setMinutes(setHours(parseISO(`${date}T00:00:00`), endHour), endMinute);

        let slotEnd = addMinutes(start, 30);
        while (slotEnd <= workEnd && this.isIntervalAvailable(start, slotEnd, daySchedule)) {
          this.availableEndTimes.push(formatDate(slotEnd, 'HH:mm', 'en-US'));
          slotEnd = addMinutes(slotEnd, 30);
        }
      }
    }

    let selectedEnd = this.blockForm.get('endTime')?.value as string | undefined;
    if (
      !selectedEnd &&
      this.startDate &&
      formatDate(this.startDate, 'yyyy-MM-dd', 'en-US') === date &&
      formatDate(this.startDate, 'HH:mm', 'en-US') === startTime
    ) {
      selectedEnd = formatDate(addMinutes(this.startDate, 30), 'HH:mm', 'en-US');
    }
    if (selectedEnd && !this.availableEndTimes.includes(selectedEnd)) {
      this.availableEndTimes.push(selectedEnd);
      this.availableEndTimes.sort();
    }
  }

  private isIntervalAvailable(start: Date, end: Date, daySchedule: DaySchedule): boolean {
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
      if (this.isEditMode && block.id === this.timeBlock?.id) continue;
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

  private configureFormForMode(): void {
    if (this.timeBlock) {
      this.isEditMode = true;
      const start = this.timeBlock.start.toDate();
      const end = this.timeBlock.end.toDate();
      const dateStr = formatDate(start, 'yyyy-MM-dd', 'en-US');
      const startStr = formatDate(start, 'HH:mm', 'en-US');
      const endStr = formatDate(end, 'HH:mm', 'en-US');
      this.blockForm.patchValue({
        title: this.timeBlock.title,
        date: dateStr,
        startTime: startStr,
        endTime: endStr,
      });
      this.generateAvailableStartTimes(dateStr);
      this.generateAvailableEndTimes(dateStr, startStr);
    } else {
      this.isEditMode = false;
      this.blockForm.reset();
      const dateStr = formatDate(this.startDate, 'yyyy-MM-dd', 'en-US');
      const startStr = formatDate(this.startDate, 'HH:mm', 'en-US');
      const endStr = formatDate(addMinutes(this.startDate, 30), 'HH:mm', 'en-US');
      this.blockForm.patchValue({
        title: 'Horario Bloqueado',
        date: dateStr,
        startTime: startStr,
        endTime: endStr,
      });
      this.generateAvailableStartTimes(dateStr);
      this.generateAvailableEndTimes(dateStr, startStr);
    }
  }

  save(): void {
    if (this.blockForm.invalid) return;
    this.isLoading = true;
    const formValue = this.blockForm.value;
    const startDate = parseISO(`${formValue.date}T${formValue.startTime}`);
    const endDate = parseISO(`${formValue.date}T${formValue.endTime}`);

    const blockData: any = {
      title: formValue.title,
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      color: { primary: '#6c757d', secondary: '#e9ecef' },
    };

    if (this.isEditMode) {
      blockData.id = this.timeBlock?.id;
    }

    this.onSave(blockData as TimeBlock)
      .finally(() => {
        this.isLoading = false;
        this.dialogRef.close(blockData);
      });
  }

  requestDelete(): void {
    this.showConfirmationDialog = true;
  }

  confirmDelete(): void {
    if (this.timeBlock?.id) {
      this.onDelete.emit(this.timeBlock.id);
      this.dialogRef.close();
    }
    this.showConfirmationDialog = false;
  }

  cancelDelete(): void {
    this.showConfirmationDialog = false;
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
