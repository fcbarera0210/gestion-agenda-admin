import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule, DatePipe } from '@angular/common';
import { Observable, of } from 'rxjs';
import { HistoryEntry } from '../../services/clients-service';
import { Appointment } from '../../services/appointments-service';
import { AppointmentDetailModalComponent } from '../appointment-detail-modal-component/appointment-detail-modal-component';

@Component({
  selector: 'app-history-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, AppointmentDetailModalComponent],
  animations: [
    trigger('backdrop', [
      transition(':enter', [style({ opacity: 0 }), animate('300ms ease-out', style({ opacity: 1 }))]),
      transition(':leave', [animate('300ms ease-in', style({ opacity: 0 }))]),
    ]),
    trigger('modal', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
  templateUrl: './history-modal-component.html',
})
export class HistoryModalComponent implements OnInit {
  @Input() dataHistory$!: Observable<HistoryEntry[]>;
  @Input() appointmentHistory$: Observable<Appointment[]> = of([]);
  @Input() showAppointmentHistoryTab = false;
  @Input() title = 'Historial del Cliente';
  @Output() onCancel = new EventEmitter<void>();

  activeTab: 'data' | 'appointments' = 'data';
  selectedAppointment?: Appointment;
  showAppointmentDetailModal = false;

  ngOnInit(): void {
    this.activeTab = this.showAppointmentHistoryTab ? 'appointments' : 'data';
  }

  get entityLabel(): string {
    return this.title.toLowerCase().includes('servicio') ? 'servicio' : 'cliente';
  }

  private statusLabels: Record<string, string> = {
    confirmed: 'confirmada',
    pending: 'pendiente',
    cancelled: 'cancelada',
  };

  constructor() {}

  selectTab(tab: 'data' | 'appointments'): void {
    this.activeTab = tab;
  }

  openAppointmentDetail(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.showAppointmentDetailModal = true;
  }

  closeAppointmentDetail(): void {
    this.showAppointmentDetailModal = false;
    this.selectedAppointment = undefined;
  }

  translateStatus(status: string): string {
    return this.statusLabels[status] || status;
  }

  cancel(): void {
    this.onCancel.emit();
  }
}