import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Observable, of } from 'rxjs';
import { HistoryEntry } from '../../services/clients-service';
import { Appointment } from '../../services/appointments-service';

@Component({
  selector: 'app-history-modal',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './history-modal-component.html',
})
export class HistoryModalComponent {
  @Input() dataHistory$!: Observable<HistoryEntry[]>;
  @Input() appointmentHistory$: Observable<Appointment[]> = of([]); 
  @Input() showAppointmentHistoryTab = false; 
  @Output() onCancel = new EventEmitter<void>();

  activeTab: 'data' | 'appointments' = 'appointments'; // La pestaña activa por defecto

  private statusLabels: Record<string, string> = {
    confirmed: 'confirmada',
    pending: 'pendiente',
    cancelled: 'cancelada',
  };

  constructor() {}

  selectTab(tab: 'data' | 'appointments'): void {
    this.activeTab = tab;
  }

  translateStatus(status: string): string {
    return this.statusLabels[status] || status;
  }

  cancel(): void {
    this.onCancel.emit();
  }
}