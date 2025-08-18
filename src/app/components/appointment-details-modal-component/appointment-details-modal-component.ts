import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';

import { Appointment } from '../../services/appointments-service';
import { ClientsService, Client } from '../../services/clients-service';
import { ServicesService } from '../../services/services-service';

@Component({
  selector: 'app-appointment-details-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-details-modal-component.html',
})
export class AppointmentDetailsModalComponent implements OnInit {
  @Input() appointment!: Appointment;
  @Output() onSave = new EventEmitter<Appointment>();
  @Output() onCancel = new EventEmitter<void>();

  client?: Client;
  serviceName = '';
  form: FormGroup;
  isLoading = false;

  constructor(
    private clientsService: ClientsService,
    private servicesService: ServicesService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      status: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    if (this.appointment) {
      this.form.patchValue({
        status: this.appointment.status,
        notes: this.appointment.notes || '',
      });

      combineLatest([
        this.clientsService.getClients(),
        this.servicesService.getServices(),
      ]).subscribe(([clients, services]) => {
        this.client = clients.find(c => c.id === this.appointment.clientId);
        const service = services.find(s => s.id === this.appointment.serviceId);
        this.serviceName = service?.name || '';
      });
    }
  }

  setStatus(status: Appointment['status']): void {
    this.form.get('status')?.setValue(status);
  }

  save(): void {
    this.isLoading = true;
    const updated: Appointment = {
      ...this.appointment,
      status: this.form.value.status,
      notes: this.form.value.notes,
    };
    this.onSave.emit(updated);
  }

  cancel(): void {
    this.onCancel.emit();
  }
}
