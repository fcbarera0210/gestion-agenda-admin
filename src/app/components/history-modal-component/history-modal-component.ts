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
export class HistoryModalComponent implements OnInit {
  @Input() dataHistory$!: Observable<HistoryEntry[]>;
  @Input() appointmentHistory$: Observable<Appointment[]> = of([]);
  @Input() showAppointmentHistoryTab = false;
  @Input() title = 'Historial del Cliente';
  @Output() onCancel = new EventEmitter<void>();

  activeTab: 'data' | 'appointments' = 'data';

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

  translateStatus(status: string): string {
    return this.statusLabels[status] || status;
  }

  cancel(): void {
    this.onCancel.emit();
  }
}