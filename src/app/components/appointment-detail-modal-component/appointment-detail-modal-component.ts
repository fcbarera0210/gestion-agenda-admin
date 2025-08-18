import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Appointment } from '../../services/appointments-service';

@Component({
  selector: 'app-appointment-detail-modal',
  standalone: true,
  imports: [CommonModule, DatePipe],
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

