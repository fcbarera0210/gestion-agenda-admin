import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { HistoryEntry } from '../../services/clients-service'; // La interfaz es la misma

@Component({
  selector: 'app-history-modal',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './history-modal-component.html',
})
export class HistoryModalComponent {
  // 👇 EN LUGAR de clientId, ahora recibe el Observable con el historial
  @Input() history$!: Observable<HistoryEntry[]>;
  @Output() onCancel = new EventEmitter<void>();

  constructor() {} // Ya no necesita el servicio

  cancel(): void {
    this.onCancel.emit();
  }
}