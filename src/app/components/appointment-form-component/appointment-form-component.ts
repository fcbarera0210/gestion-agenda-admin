import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { Observable, firstValueFrom, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Timestamp } from '@angular/fire/firestore';
import { addMinutes, parseISO } from 'date-fns';

import { Client, ClientsService } from '../../services/clients-service';
import { Service, ServicesService } from '../../services/services-service';
import { Appointment, AppointmentStatus, AppointmentType, AppointmentsService } from '../../services/appointments-service';
import { TimeBlock, TimeBlockService } from '../../services/time-block-service';
import { SettingsService, WorkSchedule } from '../../services/settings-service';
import { TimeSlotService } from '../../services/time-slot.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog-component/confirmation-dialog-component';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmationDialogComponent],
  templateUrl: './appointment-form-component.html',
})
export class AppointmentFormComponent implements OnInit, OnChanges {
  private statusColors: any = {
    confirmed: { primary: '#1e90ff', secondary: '#D1E8FF' }, // Azul
    pending:   { primary: '#ffc107', secondary: '#FFF3CD' }, // Amarillo
    cancelled: { primary: '#dc3545', secondary: '#F8D7DA' }, // Rojo
  };
  @Input() startDate!: Date;
  @Input() mode: 'appointment' | 'block' = 'appointment';
  @Input() appointment: Appointment | TimeBlock | undefined | null = null;
  @Input() isDeleting = false;
  @Output() onSave = new EventEmitter<Appointment | TimeBlock>();
  @Output() onCancel = new EventEmitter<void>();

  appointmentForm: FormGroup;
  clients$: Observable<Client[]>;
  services$: Observable<Service[]>;
  filteredClients$: Observable<Client[]>;
  filteredServices$: Observable<Service[]>;
  clientSearch = new FormControl('');
  serviceSearch = new FormControl('');
  private clients: Client[] = [];
  private services: Service[] = [];

  isLoading = false;
  isEditMode = false;

  availableDates: string[] = [];
  availableTimes: string[] = [];
  workSchedule: WorkSchedule | null = null;
  appointments: Appointment[] = [];
  timeBlocks: TimeBlock[] = [];

  showConfirmationDialog = false;
  @Output() onDelete = new EventEmitter<string>();

  constructor(
    private fb: FormBuilder,
    private clientsService: ClientsService,
    private servicesService: ServicesService,
    private appointmentsService: AppointmentsService,
    private timeBlockService: TimeBlockService,
    private settingsService: SettingsService,
    private timeSlotService: TimeSlotService
  ) {
    this.appointmentForm = this.fb.group({
      clientId: [''],
      serviceId: [''],
      date: ['', Validators.required],
      time: ['', Validators.required],
      status: ['confirmed' as AppointmentStatus],
      type: ['presencial' as AppointmentType],
      notes: ['']
    });

    this.clients$ = this.clientsService.getClients();
    this.services$ = this.servicesService.getServices();

    this.filteredClients$ = combineLatest([
      this.clients$,
      this.clientSearch.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([clients, term]) =>
        clients.filter(c => c.name.toLowerCase().includes((term || '').toLowerCase()))
      )
    );

    this.filteredServices$ = combineLatest([
      this.services$,
      this.serviceSearch.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([services, term]) =>
        services.filter(s => s.name.toLowerCase().includes((term || '').toLowerCase()))
      )
    );

    this.clients$.subscribe(list => {
      this.clients = list;
      if (this.appointment) {
        const current = list.find(c => c.id === this.appointment!.clientId);
        if (current) {
          this.clientSearch.setValue(current.name, { emitEvent: false });
        }
      }
    });

    this.services$.subscribe(list => {
      this.services = list;
      if (this.appointment) {
        const current = list.find(s => s.id === this.appointment!.serviceId);
        if (current) {
          this.serviceSearch.setValue(current.name, { emitEvent: false });
        }
      }
    });

    this.clientSearch.valueChanges.subscribe(name => {
      const client = this.clients.find(c => c.name.toLowerCase() === (name || '').toLowerCase());
      this.appointmentForm.get('clientId')?.setValue(client ? client.id : '');
    });

    this.serviceSearch.valueChanges.subscribe(name => {
      const service = this.services.find(s => s.name.toLowerCase() === (name || '').toLowerCase());
      this.appointmentForm.get('serviceId')?.setValue(service ? service.id : '');
    });
  }

  ngOnInit(): void {
    this.applyModeValidators();
    this.loadData();
    this.appointmentForm.get('date')?.valueChanges.subscribe(date => {
      if (date) {
        this.generateAvailableTimes(date);
      }
    });
    this.appointmentForm.get('serviceId')?.valueChanges.subscribe(() => {
      const date = this.appointmentForm.get('date')?.value;
      if (date) {
        this.generateAvailableTimes(date);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      this.applyModeValidators();
    }
    this.configureFormForMode();
  }

  private applyModeValidators(): void {
    const controls = ['clientId', 'serviceId', 'status', 'type'];
    if (this.mode === 'appointment') {
      controls.forEach(c => this.appointmentForm.get(c)?.setValidators(Validators.required));
    } else {
      controls.forEach(c => this.appointmentForm.get(c)?.clearValidators());
    }
    controls.forEach(c => this.appointmentForm.get(c)?.updateValueAndValidity());
  }

  loadData(): void {
    combineLatest([
      this.settingsService.getProfessionalProfile(),
      this.appointmentsService.getAppointments(),
      this.timeBlockService.getTimeBlocks()
    ]).subscribe(async ([profile, appointments, blocks]) => {
      this.workSchedule = profile?.workSchedule || null;
      this.appointments = appointments;
      this.timeBlocks = blocks;
      this.availableDates = this.timeSlotService.getAvailableDates(this.workSchedule);
      const date = this.appointmentForm.get('date')?.value;
      if (date) {
        await this.generateAvailableTimes(date);
        if (this.isEditMode && this.appointment) {
          const timeStr = formatDate(this.appointment.start.toDate(), 'HH:mm', 'en-US');
          this.appointmentForm.get('time')?.setValue(timeStr);
        }
      }
    });
  }

  async generateAvailableTimes(date: string): Promise<void> {
    this.availableTimes = [];
    if (!this.workSchedule) {
      return;
    }

    const services = await firstValueFrom(this.services$);
    const serviceId = this.appointmentForm.get('serviceId')?.value;
    const selectedService = services.find(s => s.id === serviceId);
    const duration = selectedService ? selectedService.duration : 30;

    const options: any = {
      date,
      duration,
      workSchedule: this.workSchedule,
      appointments: this.appointments,
      timeBlocks: this.timeBlocks,
    };
    if (this.isEditMode) {
      if (this.mode === 'appointment') {
        options.excludeAppointmentId = this.appointment?.id;
      } else {
        options.excludeBlockId = this.appointment?.id;
      }
    }
    this.availableTimes = this.timeSlotService.getAvailableTimes(options);

    if (this.isEditMode && this.appointment) {
      const currentDate = formatDate(this.appointment.start.toDate(), 'yyyy-MM-dd', 'en-US');
      const currentTime = formatDate(this.appointment.start.toDate(), 'HH:mm', 'en-US');
      if (currentDate === date && !this.availableTimes.includes(currentTime)) {
        this.availableTimes.push(currentTime);
        this.availableTimes.sort();
      }
    }
  }

  onDateChange(date: string): void {
    this.generateAvailableTimes(date);
  }

  setStatus(status: AppointmentStatus): void {
    this.appointmentForm.get('status')?.setValue(status);
    this.appointmentForm.get('status')?.markAsTouched();
  }

  setType(type: AppointmentType): void {
    this.appointmentForm.get('type')?.setValue(type);
    this.appointmentForm.get('type')?.markAsTouched();
  }

  // --- Lógica de Eliminación ---

  // 3. Abre el diálogo de confirmación
  requestDelete(): void {
    this.showConfirmationDialog = true;
  }

  // 4. Se ejecuta si el usuario confirma la eliminación
  confirmDelete(): void {
    if (this.appointment?.id) {
      this.onDelete.emit(this.appointment.id);
    }
    this.showConfirmationDialog = false;
  }

  // 5. Se ejecuta si el usuario cancela
  cancelDelete(): void {
    this.showConfirmationDialog = false;
  }
  
  private configureFormForMode(): void {
    if (this.appointment) {
      this.isEditMode = true;
      const start = this.appointment.start.toDate();
      const dateStr = formatDate(start, 'yyyy-MM-dd', 'en-US');
      const timeStr = formatDate(start, 'HH:mm', 'en-US');

      const patch: any = { date: dateStr, time: timeStr };
      if (this.mode === 'appointment') {
        const apt = this.appointment as Appointment;
        patch.clientId = apt.clientId;
        patch.serviceId = apt.serviceId;
        patch.status = apt.status;
        patch.type = apt.type;
        patch.notes = apt.notes || '';

        const client = this.clients.find(c => c.id === apt.clientId);
        if (client) {
          this.clientSearch.setValue(client.name, { emitEvent: false });
        }

        const service = this.services.find(s => s.id === apt.serviceId);
        if (service) {
          this.serviceSearch.setValue(service.name, { emitEvent: false });
        }
      } else {
        const block = this.appointment as TimeBlock;
        patch.notes = block.title || '';
      }

      this.appointmentForm.patchValue(patch);
      this.generateAvailableTimes(dateStr).then(() => {
        this.appointmentForm.get('time')?.setValue(timeStr);
      });
    } else {
      this.isEditMode = false;
      this.appointmentForm.reset();
      const dateStr = formatDate(this.startDate, 'yyyy-MM-dd', 'en-US');
      const timeStr = formatDate(this.startDate, 'HH:mm', 'en-US');
      const patch: any = { date: dateStr, time: timeStr };
      if (this.mode === 'appointment') {
        patch.status = 'confirmed';
        patch.type = 'presencial';
      }
      this.appointmentForm.patchValue(patch);
      this.clientSearch.setValue('', { emitEvent: false });
      this.serviceSearch.setValue('', { emitEvent: false });
    }
  }

  onClientBlur(): void {
    const name = this.clientSearch.value || '';
    const client = this.clients.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!client) {
      this.appointmentForm.get('clientId')?.setValue('');
      this.clientSearch.setValue('', { emitEvent: false });
    }
    this.appointmentForm.get('clientId')?.markAsTouched();
  }

  onServiceBlur(): void {
    const name = this.serviceSearch.value || '';
    const service = this.services.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (!service) {
      this.appointmentForm.get('serviceId')?.setValue('');
      this.serviceSearch.setValue('', { emitEvent: false });
    }
    this.appointmentForm.get('serviceId')?.markAsTouched();
  }

  clearClient(): void {
    this.clientSearch.setValue('');
    this.appointmentForm.get('clientId')?.setValue('');
  }

  clearService(): void {
    this.serviceSearch.setValue('');
    this.appointmentForm.get('serviceId')?.setValue('');
  }

  async save(): Promise<void> {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    
    const formValue = this.appointmentForm.value;
    const startDate = parseISO(`${formValue.date}T${formValue.time}`);

    const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][startDate.getDay()];
    const daySchedule = this.workSchedule ? this.workSchedule[dayName] : undefined;

    let duration = 30;
    let excludeAppointmentId: string | undefined;
    let excludeBlockId: string | undefined;

    if (this.mode === 'appointment') {
      const services = await firstValueFrom(this.services$);
      const selectedService = services.find(s => s.id === formValue.serviceId);
      if (!selectedService) {
        this.isLoading = false;
        return;
      }
      duration = selectedService.duration;
      excludeAppointmentId = this.isEditMode ? (this.appointment as Appointment)?.id : undefined;
      if (
        !daySchedule ||
        !this.timeSlotService.isIntervalAvailable(
          startDate,
          addMinutes(startDate, duration),
          daySchedule,
          this.appointments,
          this.timeBlocks,
          excludeAppointmentId
        )
      ) {
        this.isLoading = false;
        this.appointmentForm.get('time')?.setErrors({ unavailable: true });
        return;
      }

      const endDate = addMinutes(startDate, duration);
      const appointmentData: any = {
        professionalId: (this.appointment as Appointment)?.professionalId,
        clientId: formValue.clientId,
        serviceId: formValue.serviceId,
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        title: `${selectedService.name}`,
        color: this.statusColors[formValue.status as AppointmentStatus],
        status: formValue.status,
        type: formValue.type,
        notes: formValue.notes
      };

      try {
        if (this.isEditMode) {
          appointmentData.id = (this.appointment as Appointment)?.id;
          await this.appointmentsService.updateAppointment(appointmentData);
        } else {
          await this.appointmentsService.addAppointment(appointmentData);
        }
        this.onSave.emit(appointmentData as Appointment);
      } finally {
        this.isLoading = false;
      }
    } else {
      excludeBlockId = this.isEditMode ? (this.appointment as TimeBlock)?.id : undefined;
      if (
        !daySchedule ||
        !this.timeSlotService.isIntervalAvailable(
          startDate,
          addMinutes(startDate, duration),
          daySchedule,
          this.appointments,
          this.timeBlocks,
          undefined,
          excludeBlockId
        )
      ) {
        this.isLoading = false;
        this.appointmentForm.get('time')?.setErrors({ unavailable: true });
        return;
      }

      const endDate = addMinutes(startDate, duration);
      const blockData: any = {
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        title: formValue.notes || 'Horario Bloqueado',
        color: { primary: '#6c757d', secondary: '#e9ecef' }
      };

      try {
        if (this.isEditMode) {
          blockData.id = (this.appointment as TimeBlock)?.id;
          await this.timeBlockService.updateTimeBlock(blockData);
        } else {
          await this.timeBlockService.addTimeBlock(blockData);
        }
        this.onSave.emit(blockData as TimeBlock);
      } finally {
        this.isLoading = false;
      }
    }
  }

  cancel(): void {
    this.onCancel.emit();
  }
}

