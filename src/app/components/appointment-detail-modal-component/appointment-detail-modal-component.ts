import { Component, EventEmitter, Input, Output } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule, DatePipe } from '@angular/common';
import { Appointment } from '../../services/appointments-service';

@Component({
  selector: 'app-appointment-detail-modal',
  standalone: true,
  imports: [CommonModule, DatePipe],
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
  templateUrl: './appointment-detail-modal-component.html',
})
export class AppointmentDetailModalComponent {
  @Input() appointment!: Appointment;
  @Output() onClose = new EventEmitter<void>();

  private statusLabels: Record<string, string> = {
    confirmed: 'confirmada',
    pending: 'pendiente',
    cancelled: 'cancelada',
  };

  translateStatus(status: string): string {
    return this.statusLabels[status] || status;
  }

  close(): void {
    this.onClose.emit();
  }
}

