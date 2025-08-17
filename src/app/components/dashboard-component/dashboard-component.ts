import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { startOfDay, endOfDay } from 'date-fns';

// Componentes y Servicios
import { AppointmentsService, Appointment } from '../../services/appointments-service';
import { ClientsService } from '../../services/clients-service';
import { ServicesService } from '../../services/services-service';
import { TimeBlock, TimeBlockService } from '../../services/time-block-service';
import { ToastService } from '../../services/toast-service';
import { AppointmentFormComponent } from '../../components/appointment-form-component/appointment-form-component';
import { TimeBlockFormComponent } from '../../components/time-block-form-component/time-block-form-component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, AppointmentFormComponent, TimeBlockFormComponent],
  templateUrl: './dashboard-component.html',
})
export class DashboardComponent implements OnInit {

  upcomingAppointments$!: Observable<Appointment[]>;
  clientsMap = new Map<string, string>();
  stats = {
    totalClients: 0,
    totalServices: 0,
    pendingAppointments: 0,
  };

  // Propiedades para los modales de acción rápida
  showAppointmentModal = false;
  showTimeBlockModal = false;
  selectedDate: Date | null = null;

  constructor(
    private appointmentsService: AppointmentsService,
    private clientsService: ClientsService,
    private servicesService: ServicesService,
    private timeBlockService: TimeBlockService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Combinamos la carga de clientes, servicios y citas
    this.upcomingAppointments$ = combineLatest([
      this.clientsService.getClients(),
      this.servicesService.getServices(),
      this.appointmentsService.getAppointments()
    ]).pipe(
      map(([clients, services, appointments]) => {
        // 1. Calculamos las estadísticas
        this.stats.totalClients = clients.length;
        this.stats.totalServices = services.length;
        this.stats.pendingAppointments = appointments.filter(apt => apt.status === 'pending').length;
        this.clientsMap = new Map(clients.map(client => [client.id!, client.name]));
        
        // Es importante forzar la detección de cambios aquí para las estadísticas
        this.cdr.markForCheck();

        // 2. Filtramos y ordenamos las citas de hoy
        return appointments
          .filter(apt => {
            const aptDate = apt.start.toDate();
            return aptDate >= todayStart && aptDate <= todayEnd && apt.status !== 'cancelled';
          })
          .sort((a, b) => a.start.toDate().getTime() - b.start.toDate().getTime());
      })
    );
  }

  // --- Lógica para los Modales de Acción Rápida ---

  openNewAppointmentModal(): void {
    this.selectedDate = new Date(); // La cita por defecto es "ahora"
    this.showAppointmentModal = true;
  }

  openNewBlockModal(): void {
    this.selectedDate = new Date(); // El bloqueo por defecto es "ahora"
    this.showTimeBlockModal = true;
  }

  closeAllModals(): void {
    this.showAppointmentModal = false;
    this.showTimeBlockModal = false;
    this.selectedDate = null;
  }
  
  // Reutilizamos la lógica de guardado de la agenda
  handleSaveAppointment(appointmentData: any): void {
    const promise = appointmentData.id
      ? this.appointmentsService.updateAppointment(appointmentData)
      : this.appointmentsService.addAppointment(appointmentData);

    promise
      .then(() => {
        this.toastService.show('Cita guardada con éxito', 'success');
        this.closeAllModals();
      })
      .catch(err => {
        this.toastService.show('Error al guardar la cita', 'error');
        console.error(err);
      });
  }

  handleSaveTimeBlock(blockData: TimeBlock): void {
    this.timeBlockService.addTimeBlock(blockData)
      .then(() => {
        this.toastService.show('Horario bloqueado con éxito', 'success');
        this.closeAllModals();
      })
      .catch(err => {
        this.toastService.show('Error al guardar el bloqueo', 'error');
        console.error(err);
      });
  }
}