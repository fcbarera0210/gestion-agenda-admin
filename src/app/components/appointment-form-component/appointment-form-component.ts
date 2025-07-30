import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, firstValueFrom } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import { addMinutes, parseISO } from 'date-fns';

import { Client, ClientsService } from '../../services/clients-service';
import { Service, ServicesService } from '../../services/services-service';
import { Appointment, AppointmentStatus } from '../../services/appointments-service';

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-form-component.html',
})
export class AppointmentFormComponent implements OnInit, OnChanges {
  private statusColors: any = {
    confirmed: { primary: '#1e90ff', secondary: '#D1E8FF' }, // Azul
    pending:   { primary: '#ffc107', secondary: '#FFF3CD' }, // Amarillo
    cancelled: { primary: '#dc3545', secondary: '#F8D7DA' }, // Rojo
  };
  @Input() startDate!: Date;
  @Input() appointment: Appointment | null = null;
  @Output() onSave = new EventEmitter<Appointment>();
  @Output() onCancel = new EventEmitter<void>();

  appointmentForm: FormGroup;
  clients$: Observable<Client[]>;
  services$: Observable<Service[]>;
  
  isLoading = false;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private clientsService: ClientsService,
    private servicesService: ServicesService
  ) {
    this.appointmentForm = this.fb.group({
      clientId: ['', Validators.required],
      serviceId: ['', Validators.required],
      start: ['', Validators.required],
      status: ['confirmed' as AppointmentStatus, Validators.required],
    });

    this.clients$ = this.clientsService.getClients();
    this.services$ = this.servicesService.getServices();
  }

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    this.configureFormForMode();
  }
  
  private configureFormForMode(): void {
    if (this.appointment) {
      this.isEditMode = true;
      setTimeout(() => {
        this.appointmentForm.patchValue({
          clientId: this.appointment!.clientId,
          serviceId: this.appointment!.serviceId,
          start: formatDate(this.appointment!.start.toDate(), 'yyyy-MM-ddTHH:mm', 'en-US'),
          status: this.appointment!.status,
        });
      });
    } else {
      this.isEditMode = false;
      this.appointmentForm.reset(); 
      this.appointmentForm.patchValue({
        start: formatDate(this.startDate, 'yyyy-MM-ddTHH:mm', 'en-US'),
        status: 'confirmed'
      });
    }
  }

  async save(): Promise<void> {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    
    const formValue = this.appointmentForm.value;
    const startDate = parseISO(formValue.start);
    
    const services = await firstValueFrom(this.services$);
    const selectedService = services.find(s => s.id === formValue.serviceId);

    if (!selectedService) {
      this.isLoading = false;
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