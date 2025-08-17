import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { Observable, firstValueFrom, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Timestamp } from '@angular/fire/firestore';
import { addMinutes, parseISO, addDays, setHours, setMinutes, areIntervalsOverlapping } from 'date-fns';

import { Client, ClientsService } from '../../services/clients-service';
import { Service, ServicesService } from '../../services/services-service';
import { Appointment, AppointmentStatus, AppointmentType, AppointmentsService } from '../../services/appointments-service';
import { TimeBlock, TimeBlockService } from '../../services/time-block-service';
import { SettingsService, WorkSchedule, DaySchedule } from '../../services/settings-service';
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
  @Input() appointment: Appointment | undefined | null = null;
  @Input() isDeleting = false;
  @Output() onSave = new EventEmitter<Appointment>();
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
    private settingsService: SettingsService
  ) {
    this.appointmentForm = this.fb.group({
      clientId: ['', Validators.required],
      serviceId: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
      status: ['confirmed' as AppointmentStatus, Validators.required],
      type: ['presencial' as AppointmentType, Validators.required],
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
    this.configureFormForMode();
  }

  loadData(): void {
    combineLatest([
      this.settingsService.getProfessionalProfile(),
      this.appointmentsService.getAppointments(),
      this.timeBlockService.getTimeBlocks()
    ]).subscribe(([profile, appointments, blocks]) => {
      this.workSchedule = profile?.workSchedule || null;
      this.appointments = appointments;
      this.timeBlocks = blocks;
      this.generateAvailableDates();
      const date = this.appointmentForm.get('date')?.value;
      if (date) {
        this.generateAvailableTimes(date);
      }
    });
  }

  generateAvailableDates(): void {
    this.availableDates = [];
    if (!this.workSchedule) {
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
  }

  async generateAvailableTimes(date: string): Promise<void> {
    this.availableTimes = [];
    if (!this.workSchedule) {
      return;
    }

    const services = await firstValueFrom(this.services$);
    const serviceId = this.appointmentForm.get('serviceId')?.value;
    const selectedService = services.find(s => s.id === serviceId);
    if (!selectedService) {
      return;
    }

    const baseDate = parseISO(`${date}T00:00:00`);
    const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][baseDate.getDay()];
    const daySchedule = this.workSchedule[dayName];
    if (!daySchedule || !daySchedule.isActive) {
      return;
    }

    const [startHour, startMinute] = daySchedule.workHours.start.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.workHours.end.split(':').map(Number);
    let slotStart = setMinutes(setHours(baseDate, startHour), startMinute);
    const workEnd = setMinutes(setHours(baseDate, endHour), endMinute);

    while (addMinutes(slotStart, selectedService.duration) <= workEnd) {
      if (this.isSlotAvailable(slotStart, selectedService.duration, daySchedule)) {
        this.availableTimes.push(formatDate(slotStart, 'HH:mm', 'en-US'));
      }
      slotStart = addMinutes(slotStart, 30);
    }

    if (this.isEditMode) {
      const currentDate = formatDate(this.appointment!.start.toDate(), 'yyyy-MM-dd', 'en-US');
      const currentTime = formatDate(this.appointment!.start.toDate(), 'HH:mm', 'en-US');
      if (currentDate === date && !this.availableTimes.includes(currentTime)) {
        this.availableTimes.push(currentTime);
        this.availableTimes.sort();
      }
    }
  }

  private isSlotAvailable(start: Date, duration: number, daySchedule: DaySchedule): boolean {
    const end = addMinutes(start, duration);
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
      if (this.isEditMode && apt.id === this.appointment?.id) continue;
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
      this.appointmentForm.patchValue({
        clientId: this.appointment!.clientId,
        serviceId: this.appointment!.serviceId,
        date: formatDate(this.appointment!.start.toDate(), 'yyyy-MM-dd', 'en-US'),
        time: formatDate(this.appointment!.start.toDate(), 'HH:mm', 'en-US'),
        status: this.appointment!.status,
        type: this.appointment!.type,
        notes: this.appointment!.notes || ''
      });
      const client = this.clients.find(c => c.id === this.appointment!.clientId);
      if (client) {
        this.clientSearch.setValue(client.name, { emitEvent: false });
      }
      const service = this.services.find(s => s.id === this.appointment!.serviceId);
      if (service) {
        this.serviceSearch.setValue(service.name, { emitEvent: false });
      }
    } else {
      this.isEditMode = false;
      this.appointmentForm.reset();
      const dateStr = formatDate(this.startDate, 'yyyy-MM-dd', 'en-US');
      const timeStr = formatDate(this.startDate, 'HH:mm', 'en-US');
      this.appointmentForm.patchValue({
        date: dateStr,
        time: timeStr,
        status: 'confirmed',
        type: 'presencial'
      });
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

    const services = await firstValueFrom(this.services$);
    const selectedService = services.find(s => s.id === formValue.serviceId);

    if (!selectedService) {
      this.isLoading = false;
      return;
    }

    const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][startDate.getDay()];
    const daySchedule = this.workSchedule ? this.workSchedule[dayName] : undefined;
    if (!daySchedule || !this.isSlotAvailable(startDate, selectedService.duration, daySchedule)) {
      this.isLoading = false;
      this.appointmentForm.get('time')?.setErrors({ unavailable: true });
      return;
    }

    const endDate = addMinutes(startDate, selectedService.duration);
    
    // 👇 **AQUÍ ESTÁ LA CORRECCIÓN**
    // 1. Creamos un objeto base sin el 'id'.
    const appointmentData: any = {
      professionalId: this.appointment?.professionalId,
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

    // 2. Si estamos en modo edición, añadimos el 'id' al objeto.
    if (this.isEditMode) {
      appointmentData.id = this.appointment?.id;
    }

    // 3. Emitimos el objeto, que tendrá o no el 'id' según corresponda.
    this.onSave.emit(appointmentData as Appointment);
  }

  cancel(): void {
    this.onCancel.emit();
  }
}

