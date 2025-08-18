import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

// Componentes y Servicios
import {
  AppointmentsService,
  Appointment,
} from '../../services/appointments-service';
import { ClientsService } from '../../services/clients-service';
import { ServicesService } from '../../services/services-service';
import { TimeBlock, TimeBlockService } from '../../services/time-block-service';
import { ToastService } from '../../services/toast-service';
import { AppointmentFormComponent } from '../../components/appointment-form-component/appointment-form-component';
import { TimeBlockFormComponent } from '../../components/time-block-form-component/time-block-form-component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AppointmentFormComponent,
    TimeBlockFormComponent,
  ],
  templateUrl: './dashboard-component.html',
})
export class DashboardComponent implements OnInit {
  upcomingAppointments$!: Observable<Appointment[]>;
  weekAppointments$!: Observable<Appointment[]>;
  monthAppointments$!: Observable<Appointment[]>;
  pendingMonthAppointments$!: Observable<Appointment[]>;
  pendingAppointments: Appointment[] = [];
  cancelledAppointments: Appointment[] = [];
  clientsMap = new Map<string, string>();
  stats = {
    totalClients: 0,
    totalServices: 0,
    pendingAppointments: 0,
  };

  private statusLabels: Record<Appointment['status'], string> = {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    cancelled: 'Cancelada',
  };

  // Propiedades para los modales de acción rápida
  showAppointmentModal = false;
  showTimeBlockModal = false;
  selectedDate: Date | null = null;
  selectedAppointment: Appointment | null = null;

  // Control de la lista mostrada en la tarjeta principal
  activeView: 'day' | 'week' | 'month' | 'pending' | 'cancelled' = 'day';

  constructor(
    private appointmentsService: AppointmentsService,
    private clientsService: ClientsService,
    private servicesService: ServicesService,
    private timeBlockService: TimeBlockService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const combined$ = combineLatest([
      this.clientsService.getClients(),
      this.servicesService.getServices(),
      this.appointmentsService.getAppointments(),
    ]).pipe(
      map(([clients, services, appointments]) => {
        // 1. Calculamos las estadísticas y mapas
        this.stats.totalClients = clients.length;
        this.stats.totalServices = services.length;
        const nowInner = new Date();
        this.pendingAppointments = appointments
          .filter(
            (apt) => apt.status === 'pending' && apt.start.toDate() > nowInner,
          )
          .sort(
            (a, b) => a.start.toDate().getTime() - b.start.toDate().getTime(),
          );
        this.stats.pendingAppointments = this.pendingAppointments.length;
        this.cancelledAppointments = appointments
          .filter(
            (apt) =>
              apt.status === 'cancelled' && apt.start.toDate() > nowInner,
          )
          .sort(
            (a, b) => a.start.toDate().getTime() - b.start.toDate().getTime(),
          );
        this.clientsMap = new Map(
          clients.map((client) => [client.id!, client.name]),
        );

        // Es importante forzar la detección de cambios aquí para las estadísticas
        this.cdr.markForCheck();

        const futureAppointments = appointments.filter((apt) => {
          const aptDate = apt.start.toDate();
          return aptDate >= nowInner && apt.status !== 'cancelled';
        });

        const day = futureAppointments
          .filter((apt) => {
            const aptDate = apt.start.toDate();
            return aptDate >= todayStart && aptDate <= todayEnd;
          })
          .sort(
            (a, b) => a.start.toDate().getTime() - b.start.toDate().getTime(),
          );

        const week = futureAppointments
          .filter((apt) => {
            const aptDate = apt.start.toDate();
            return aptDate >= weekStart && aptDate <= weekEnd;
          })
          .sort(
            (a, b) => a.start.toDate().getTime() - b.start.toDate().getTime(),
          );

        const month = futureAppointments
          .filter((apt) => {
            const aptDate = apt.start.toDate();
            return aptDate >= monthStart && aptDate <= monthEnd;
          })
          .sort(
            (a, b) => a.start.toDate().getTime() - b.start.toDate().getTime(),
          );

        const pendingMonth = month.filter((apt) => apt.status === 'pending');

        return { day, week, month, pendingMonth };
      }),
    );

    this.upcomingAppointments$ = combined$.pipe(map((data) => data.day));
    this.weekAppointments$ = combined$.pipe(map((data) => data.week));
    this.monthAppointments$ = combined$.pipe(map((data) => data.month));
    this.pendingMonthAppointments$ = combined$.pipe(
      map((data) => data.pendingMonth),
    );
  }

  // --- Lógica para los Modales de Acción Rápida ---

  openNewAppointmentModal(): void {
    this.selectedAppointment = null;
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
    this.selectedAppointment = null;
    this.selectedDate = null;
  }

  selectView(view: 'day' | 'week' | 'month' | 'pending' | 'cancelled'): void {
    this.activeView = view;
  }

  openEditAppointment(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.selectedDate = appointment.start.toDate();
    this.showAppointmentModal = true;
  }

  getStatusLabel(status: Appointment['status']): string {
    return this.statusLabels[status] ?? status;
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
      .catch((err) => {
        this.toastService.show('Error al guardar la cita', 'error');
        console.error(err);
      });
  }

  handleSaveTimeBlock(blockData: TimeBlock): void {
    this.timeBlockService
      .addTimeBlock(blockData)
      .then(() => {
        this.toastService.show('Horario bloqueado con éxito', 'success');
        this.closeAllModals();
      })
      .catch((err) => {
        this.toastService.show('Error al guardar el bloqueo', 'error');
        console.error(err);
      });
  }
}
