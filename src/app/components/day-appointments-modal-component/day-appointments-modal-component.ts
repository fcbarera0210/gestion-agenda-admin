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

  private readonly statusTranslations: Record<string, string> = {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    cancelled: 'Cancelada',
  };

  private readonly statusClasses: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  private readonly typeClasses: Record<string, string> = {
    online: 'bg-purple-100 text-purple-800',
    presencial: 'bg-green-100 text-green-800',
  };

  close(): void {
    this.onClose.emit();
  }

  getStatusLabel(status: string): string {
    return this.statusTranslations[status] || status;
  }

  getStatusClass(status: string): string {
    return `px-2 py-0.5 rounded ${this.statusClasses[status] || 'bg-gray-100 text-gray-800'}`;
  }

  getTypeClass(type: string): string {
    return `px-2 py-0.5 rounded ${this.typeClasses[type] || 'bg-gray-100 text-gray-800'}`;
  }
}
