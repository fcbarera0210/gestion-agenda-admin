import { Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { addMinutes, parseISO } from 'date-fns';
import { combineLatest, take } from 'rxjs';

import { Appointment, AppointmentsService } from '../../services/appointments-service';
import { TimeBlock, TimeBlockService } from '../../services/time-block-service';
import { SettingsService, WorkSchedule } from '../../services/settings-service';
import { TimeSlotService } from '../../services/time-slot.service';
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
  @Output() onCancel = new EventEmitter<void>();
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
    private timeSlotService: TimeSlotService
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
        this.updateAvailableStartTimes(date);
        this.blockForm.get('startTime')?.setValue('');
        this.availableEndTimes = [];
      }
    });
    this.blockForm.get('startTime')?.valueChanges.subscribe(time => {
      const date = this.blockForm.get('date')?.value;
      if (time && date) {
        this.updateAvailableEndTimes(date, time);
      } else {
        this.availableEndTimes = [];
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.configureFormForMode();
  }

  private loadData(): void {
    const appointments$ = this.appointmentsService.getAppointments();
    const blocks$ = this.timeBlockService.getTimeBlocks();

    combineLatest([
      this.settingsService.getProfessionalProfile(),
      appointments$,
      blocks$,
    ])
      .pipe(take(1))
      .subscribe(([profile, appointments, blocks]) => {
        this.workSchedule = profile?.workSchedule || null;
        this.appointments = appointments;
        this.timeBlocks = blocks;
        this.availableDates = this.timeSlotService.getAvailableDates(this.workSchedule, this.startDate);

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
          this.updateAvailableStartTimes(date);
          const startControl = this.blockForm.get('startTime');
          let start = startControl?.value as string | undefined;
          if (!start || !this.availableStartTimes.includes(start)) {
            start = this.availableStartTimes[0];
            startControl?.setValue(start, { emitEvent: false });
          }
          if (start) {
            this.updateAvailableEndTimes(date, start);
            const endControl = this.blockForm.get('endTime');
            let end = endControl?.value as string | undefined;
            if (!end || !this.availableEndTimes.includes(end)) {
              end = this.availableEndTimes[0];
              endControl?.setValue(end, { emitEvent: false });
            }
          }
        }
      });

    appointments$.subscribe(appointments => {
      this.appointments = appointments;
      const date = this.blockForm.get('date')?.value as string | undefined;
      const start = this.blockForm.get('startTime')?.value as string | undefined;
      if (date) {
        this.updateAvailableStartTimes(date);
        if (start) {
          this.updateAvailableEndTimes(date, start);
        }
      }
    });

    blocks$.subscribe(blocks => {
      this.timeBlocks = blocks;
      const date = this.blockForm.get('date')?.value as string | undefined;
      const start = this.blockForm.get('startTime')?.value as string | undefined;
      if (date) {
        this.updateAvailableStartTimes(date);
        if (start) {
          this.updateAvailableEndTimes(date, start);
        }
      }
    });
  }

  private updateAvailableStartTimes(date: string): void {
    this.availableStartTimes = this.timeSlotService.getAvailableTimes({
      date,
      duration: 30,
      workSchedule: this.workSchedule,
      appointments: this.appointments,
      timeBlocks: this.timeBlocks,
      excludeBlockId: this.isEditMode ? this.timeBlock?.id : undefined,
    });

    let selectedStart = this.blockForm.get('startTime')?.value as string | undefined;
    if (!selectedStart && this.startDate && formatDate(this.startDate, 'yyyy-MM-dd', 'en-US') === date) {
      selectedStart = formatDate(this.startDate, 'HH:mm', 'en-US');
    }
    if (selectedStart && !this.availableStartTimes.includes(selectedStart)) {
      this.availableStartTimes.push(selectedStart);
      this.availableStartTimes.sort();
    }
  }

  private updateAvailableEndTimes(date: string, startTime: string): void {
    this.availableEndTimes = this.timeSlotService.getAvailableTimes({
      date,
      startTime,
      duration: 30,
      workSchedule: this.workSchedule,
      appointments: this.appointments,
      timeBlocks: this.timeBlocks,
      excludeBlockId: this.isEditMode ? this.timeBlock?.id : undefined,
    });

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

  onDateChange(date: string): void {
    this.updateAvailableStartTimes(date);
  }

  onStartTimeChange(time: string): void {
    const date = this.blockForm.get('date')?.value;
    if (date) {
      this.updateAvailableEndTimes(date, time);
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
      this.updateAvailableStartTimes(dateStr);
      this.updateAvailableEndTimes(dateStr, startStr);
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
      this.updateAvailableStartTimes(dateStr);
      this.updateAvailableEndTimes(dateStr, startStr);
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
      });
  }

  requestDelete(): void {
    this.showConfirmationDialog = true;
  }

  confirmDelete(): void {
    if (this.timeBlock?.id) {
      this.onDelete.emit(this.timeBlock.id);
    }
    this.showConfirmationDialog = false;
  }

  cancelDelete(): void {
    this.showConfirmationDialog = false;
  }

  cancel(): void {
    this.onCancel.emit();
  }
}
