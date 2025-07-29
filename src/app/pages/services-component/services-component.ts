import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Service, ServicesService } from '../../services/services-service';
import { ServiceFormComponent } from '../../components/service-form-component/service-form-component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog-component/confirmation-dialog-component';
import { ToastService } from '../../services/toast-service';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, ServiceFormComponent, ConfirmationDialogComponent],
  templateUrl: './services-component.html',
})
export class ServicesComponent implements OnInit {
  services$: Observable<Service[]>;
  showModal = false;
  serviceToEdit?: Service;
  showConfirmationDialog = false;
  serviceIdToDelete: string | null = null;

  constructor(
    private servicesService: ServicesService,
    private toastService: ToastService // Servicio de Toast inyectado
  ) {
    this.services$ = this.servicesService.getServices();
  }

  ngOnInit(): void {}

  // Abre el modal para añadir un nuevo servicio
  addNewService() {
    this.serviceToEdit = undefined;
    this.showModal = true;
  }

  // Abre el modal para editar un servicio existente
  editService(service: Service) {
    this.serviceToEdit = service;
    this.showModal = true;
  }

  // Cierra el modal del formulario
  closeModal() {
    this.showModal = false;
    this.serviceToEdit = undefined;
  }

  // Guarda o actualiza un servicio
  handleSave(service: Service) {
    const promise = service.id
      ? this.servicesService.updateService(service)
      : this.servicesService.addService(service);

    promise
      .then(() => {
        const message = service.id ? 'Servicio actualizado correctamente' : 'Servicio añadido con éxito';
        this.toastService.show(message, 'success');
      })
      .catch(err => {
        this.toastService.show('Ocurrió un error al guardar el servicio', 'error');
        console.error(err);
      });
      
    this.closeModal();
  }

  // Abre el diálogo de confirmación para eliminar
  handleDelete(serviceId: string) {
    this.serviceIdToDelete = serviceId;
    this.showConfirmationDialog = true;
  }

  // Procesa la eliminación tras la confirmación
  confirmDelete() {
    if (this.serviceIdToDelete) {
      this.servicesService.deleteService(this.serviceIdToDelete)
        .then(() => {
          this.toastService.show('Servicio eliminado correctamente', 'success');
        })
        .catch(err => {
          this.toastService.show('Error al eliminar el servicio', 'error');
          console.error(err);
        });
    }
    this.cancelDelete(); // Cierra el diálogo y resetea el ID
  }

  // Cierra el diálogo de confirmación
  cancelDelete() {
    this.showConfirmationDialog = false;
    this.serviceIdToDelete = null;
  }
}