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

  close(): void {
    this.onClose.emit();
  }
}
