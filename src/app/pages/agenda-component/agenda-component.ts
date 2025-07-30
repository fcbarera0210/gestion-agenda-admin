import { Component, OnInit, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarModule, DateAdapter, CalendarEvent } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { map, combineLatest } from 'rxjs'; // 👈 Importa combineLatest
import { Timestamp } from '@angular/fire/firestore';

// Componentes y Servicios
import { SettingsService, WorkSchedule } from '../../services/settings-service';
import { Appointment, AppointmentsService } from '../../services/appointments-service';
import { ClientsService } from '../../services/clients-service'; // 👈 Importa el servicio de clientes
import { AppointmentFormComponent } from '../../components/appointment-form-component/appointment-form-component';
import { ToastService } from '../../services/toast-service';
import { addDays, subDays } from 'date-fns'; 

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, CalendarModule, AppointmentFormComponent],
  templateUrl: './agenda-component.html',
  styleUrls: ['./agenda-component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush, 
})
export class AgendaComponent implements OnInit {
  
  viewDate: Date = new Date();
  events: CalendarEvent<Appointment>[] = [];
  
  excludeDays: number[] = [];
  dayStartHour = 8;
  dayEndHour = 20;

  showAppointmentModal = false;
  selectedDate: Date | null = null;
  selectedAppointment: Appointment | undefined | null = null;
  isCalendarReady = false;

  constructor(
    private settingsService: SettingsService,
    private appointmentsService: AppointmentsService,
    private clientsService: ClientsService, // 👈 Inyecta el servicio de clientes
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadWorkSchedule();
    this.loadAppointmentsAndClients(); // 👈 Se llama a la nueva función combinada
  }

  previousWeek(): void {
    this.viewDate = subDays(this.viewDate, 7);
  }

  today(): void {
    this.viewDate = new Date();
  }

  nextWeek(): void {
    this.viewDate = addDays(this.viewDate, 7);
  }

  loadWorkSchedule() {
    this.settingsService.getProfessionalProfile().subscribe(profile => {
      if (profile && profile.workSchedule) {
        this.processWorkSchedule(profile.workSchedule);
      }
      this.isCalendarReady = true;
      this.cdr.markForCheck();
    });
  }

  // 👇 Esta función ahora combina la carga de citas y clientes
  loadAppointmentsAndClients() {
    combineLatest([
      this.appointmentsService.getAppointments(),
      this.clientsService.getClients()
    ]).pipe(
      map(([appointments, clients]) => {
        // Creamos un mapa para buscar nombres de clientes de forma eficiente
        const clientsMap = new Map(clients.map(client => [client.id, client.name]));
        
        return appointments.map(apt => {
          const clientName = clientsMap.get(apt.clientId) || 'Cliente Desconocido';
          return {
            start: apt.start.toDate(),
            end: apt.end.toDate(),
            // 👇 Construimos el nuevo título con HTML para el formato
            title: `<b>${apt.title}</b><br>${clientName}`, 
            color: apt.color,
            meta: apt, // Guardamos la cita original completa
          };
        });
      })
    ).subscribe(calendarEvents => {
      this.events = calendarEvents;
      this.cdr.markForCheck(); // Forzamos la actualización visual del calendario
    });
  }

  processWorkSchedule(schedule: WorkSchedule) {
    const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const excluded: number[] = [];
    let minHour = 24;
    let maxHour = 0;
    daysOfWeek.forEach((dayName, index) => {
      const dayConfig = schedule[dayName];
      if (!dayConfig || !dayConfig.isActive || dayConfig.slots.length === 0) {
        excluded.push(index);
      } else {
        dayConfig.slots.forEach(slot => {
          const start = parseInt(slot.start.split(':')[0]);
          const end = parseInt(slot.end.split(':')[0]);
          if (start < minHour) minHour = start;
          if (end > maxHour) maxHour = end;
        });
      }
    });
    this.excludeDays = excluded;
    this.dayStartHour = Math.max(0, minHour - 1);
    this.dayEndHour = Math.min(23, maxHour + 1);
  }

  // --- Lógica del Modal ---

  onHourSegmentClicked(event: { date: Date }): void {
    this.selectedAppointment = null;
    this.selectedDate = event.date;
    this.showAppointmentModal = true;
  }

  handleEventClicked({ event }: { event: CalendarEvent<Appointment> }): void {
    this.selectedAppointment = event.meta;
    this.selectedDate = event.start;
    this.showAppointmentModal = true;
  }

  handleSaveAppointment(appointmentData: any) {
    const promise = appointmentData.id
      ? this.appointmentsService.updateAppointment(appointmentData)
      : this.appointmentsService.addAppointment(appointmentData);

    promise
      .then(() => {
        this.toastService.show('Cita guardada con éxito', 'success');
        this.closeAppointmentModal();
      })
      .catch(err => {
        this.toastService.show('Error al guardar la cita', 'error');
        console.error(err);
      });
  }
  
  closeAppointmentModal() {
    this.showAppointmentModal = false;
    this.selectedDate = null;
    this.selectedAppointment = null;
  }
}