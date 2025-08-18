import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { CalendarEvent } from 'angular-calendar';

@Component({
  selector: 'app-day-appointments-modal',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './day-appointments-modal-component.html',
})
export class DayAppointmentsModalComponent {
  @Input() date!: Date;
  @Input() events: CalendarEvent[] = [];
  @Output() onClose = new EventEmitter<void>();

  private readonly statusLabels: Record<string, string> = {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    cancelled: 'Cancelada',
  };

  private readonly statusClasses: Record<string, string> = {
    confirmed: 'bg-blue-500 text-white',
    pending: 'bg-yellow-500 text-white',
    cancelled: 'bg-red-500 text-white',
  };

  private readonly typeClasses: Record<string, string> = {
    online: 'bg-purple-500 text-white',
    presencial: 'bg-green-500 text-white',
  };

  private normalizeStatus(status: string = ''): string {
    switch (status.toLowerCase()) {
      case 'confirmada':
      case 'confirmed':
        return 'confirmed';
      case 'pendiente':
      case 'pending':
        return 'pending';
      case 'cancelada':
      case 'canceled':
      case 'cancelled':
        return 'cancelled';
      default:
        return status.toLowerCase();
    }
  }

  close(): void {
    this.onClose.emit();
  }

  getStatusLabel(status: string = ''): string {
    const key = this.normalizeStatus(status);
    return this.statusLabels[key] || status;
  }

  getStatusClass(status: string = ''): string {
    const key = this.normalizeStatus(status);
    return `px-2 py-0.5 rounded ${this.statusClasses[key] || 'bg-gray-100 text-gray-800'}`;
  }

  getTypeClass(type: string = ''): string {
    const key = type.toLowerCase();
    return `px-2 py-0.5 rounded ${this.typeClasses[key] || 'bg-gray-100 text-gray-800'}`;
  }
}
