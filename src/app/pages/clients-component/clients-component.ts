import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Client, ClientsService, HistoryEntry } from '../../services/clients-service';
import { ToastService } from '../../services/toast-service';
import { ClientFormComponent } from '../../components/client-form-component/client-form-component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog-component/confirmation-dialog-component';
import { HistoryModalComponent } from '../../components/history-modal-component/history-modal-component';
import { Appointment, AppointmentsService } from '../../services/appointments-service'; // 👈 Importa

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ClientFormComponent, ConfirmationDialogComponent, HistoryModalComponent],
  templateUrl: './clients-component.html',
})
export class ClientsComponent implements OnInit {
  clients$: Observable<Client[]>;

  // Control para el formulario de cliente
  showClientModal = false;
  clientToEdit?: Client;

  // Control para el diálogo de confirmación
  showConfirmationDialog = false;
  clientIdToDelete: string | null = null;

  // Control para el modal del historial
  showHistoryModal = false;
  selectedClientIdForHistory: string | null = null;

  historyToShow$!: Observable<HistoryEntry[]>;

  dataHistoryToShow$!: Observable<HistoryEntry[]>;
  appointmentHistoryToShow$!: Observable<Appointment[]>;

  constructor(
    private clientsService: ClientsService,
    private appointmentsService: AppointmentsService,
    private toastService: ToastService
  ) {
    this.clients$ = this.clientsService.getClients();
  }

  ngOnInit(): void {}

  // --- Lógica para el Formulario de Cliente ---
  openClientModal(client?: Client) {
    this.clientToEdit = client;
    this.showClientModal = true;
  }

  closeClientModal() {
    this.showClientModal = false;
    this.clientToEdit = undefined;
  }

  handleSaveClient(client: Client) {
    const promise = client.id
      ? this.clientsService.updateClient(client)
      : this.clientsService.addClient(client);

    promise
      .then(() => this.toastService.show('Cliente guardado con éxito', 'success'))
      .catch(err => {
        this.toastService.show('Error al guardar el cliente', 'error');
        console.error(err);
      });

    this.closeClientModal();
  }

  // --- Lógica para la Eliminación ---
  openDeleteDialog(clientId: string) {
    this.clientIdToDelete = clientId;
    this.showConfirmationDialog = true;
  }

  closeDeleteDialog() {
    this.showConfirmationDialog = false;
    this.clientIdToDelete = null;
  }

  handleDeleteClient() {
    if (!this.clientIdToDelete) return;

    this.clientsService.deleteClient(this.clientIdToDelete)
      .then(() => this.toastService.show('Cliente eliminado', 'success'))
      .catch(err => {
        this.toastService.show('Error al eliminar el cliente', 'error');
        console.error(err);
      });

    this.closeDeleteDialog();
  }

  openHistoryModal(clientId: string) {
    this.dataHistoryToShow$ = this.clientsService.getHistory(clientId);
    this.appointmentHistoryToShow$ = this.appointmentsService.getAppointmentsForClient(clientId);
    this.showHistoryModal = true;
  }

  closeHistoryModal() {
    this.showHistoryModal = false;
  }
}