import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { ClientsService, HistoryEntry } from '../../services/clients-service';

@Component({
  selector: 'app-history-modal',
  standalone: true,
  imports: [CommonModule, DatePipe], // DatePipe para formatear la fecha
  templateUrl: './history-modal-component.html',
})
export class HistoryModalComponent implements OnInit {
  @Input() clientId!: string;
  @Output() onCancel = new EventEmitter<void>();

  history$!: Observable<HistoryEntry[]>;

  constructor(private clientsService: ClientsService) {}

  ngOnInit(): void {
    this.history$ = this.clientsService.getHistory(this.clientId);
  }

  cancel(): void {
    this.onCancel.emit();
  }
}