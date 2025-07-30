import { Component, OnInit, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarModule, DateAdapter, CalendarEvent } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { es } from 'date-fns/locale/es';
import { map, combineLatest } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import { SettingsService, WorkSchedule } from '../../services/settings-service';
import { Appointment, AppointmentsService } from '../../services/appointments-service';
import { ClientsService } from '../../services/clients-service';
import { TimeBlock, TimeBlockService } from '../../services/time-block-service';
import { AppointmentFormComponent } from '../../components/appointment-form-component/appointment-form-component';
import { TimeBlockFormComponent } from '../../components/time-block-form-component/time-block-form-component';
import { ToastService } from '../../services/toast-service';
import { addDays, subDays } from 'date-fns';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, CalendarModule, AppointmentFormComponent, TimeBlockFormComponent],
  templateUrl: './agenda-component.html',
  styleUrls: ['./agenda-component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaComponent implements OnInit {
  
  locale: string = 'es';
  viewDate: Date = new Date();
  events: CalendarEvent<Appointment | TimeBlock>[] = [];
  
  excludeDays: number[] = [];
  dayStartHour = 8;
  dayEndHour = 20;
  isCalendarReady = false;

  showChoiceModal = false;
  showAppointmentModal = false;
  showTimeBlockModal = false;

  selectedDate: Date | null = null;
  selectedAppointment: Appointment | null = null;
  selectedTimeBlock: TimeBlock | null = null;

  isDeletingAppointment = false; // Estado de carga para borrar citas
  isDeletingBlock = false;      // Estado de carga para borrar bloqueos

  constructor(
    private settingsService: SettingsService,
    private appointmentsService: AppointmentsService,
    private clientsService: ClientsService,
    private timeBlockService: TimeBlockService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadWorkSchedule();
    this.loadEvents();
  }

  loadEvents() {
    combineLatest([
      this.appointmentsService.getAppointments(),
      this.clientsService.getClients(),
      this.timeBlockService.getTimeBlocks()
    ]).pipe(
      map(([appointments, clients, timeBlocks]) => {
        const clientsMap = new Map(clients.map(client => [client.id, client.name]));
        
        const appointmentEvents = appointments.map(apt => ({
          start: apt.start.toDate(),
          end: apt.end.toDate(),
          title: `<b>${apt.title}</b><br>${clientsMap.get(apt.clientId) || 'Cliente Desconocido'}`,
          color: apt.color,
          meta: { ...apt, type: 'appointment' },
        }));

        const timeBlockEvents = timeBlocks.map(block => ({
          start: block.start.toDate(),
          end: block.end.toDate(),
          title: `<i>${block.title}</i>`,
          color: block.color,
          meta: { ...block, type: 'timeBlock' },
        }));
        
        return [...appointmentEvents, ...timeBlockEvents];
      })
    ).subscribe(calendarEvents => {
      this.events = calendarEvents;
      this.cdr.markForCheck();
    });
  }
  
  onHourSegmentClicked(event: { date: Date }): void {
    this.selectedDate = event.date;
    this.showChoiceModal = true;
  }

  handleEventClicked({ event }: { event: CalendarEvent<any> }): void {
    if (event.meta.type === 'appointment') {
      this.selectedAppointment = event.meta;
      this.selectedDate = event.start;
      this.showAppointmentModal = true;
    } else if (event.meta.type === 'timeBlock') {
      this.selectedTimeBlock = event.meta;
      this.selectedDate = event.start; // Guardamos la fecha por si la necesitamos
      this.showTimeBlockModal = true;
    }
  }

  openAppointmentForm(): void {
    this.showChoiceModal = false;
    this.showAppointmentModal = true;
  }

  openTimeBlockForm(): void {
    this.showChoiceModal = false;
    this.showTimeBlockModal = true;
  }
  
  handleSaveAppointment(appointmentData: any) {
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

  handleDeleteAppointment(appointmentId: string) {
    this.isDeletingAppointment = true; // Usamos la variable correcta
    this.appointmentsService.deleteAppointment(appointmentId)
      .then(() => {
        this.toastService.show('Cita eliminada correctamente', 'success');
        this.closeAllModals();
      })
      .catch(err => {
        this.toastService.show('Error al eliminar la cita', 'error');
        console.error(err);
      })
      .finally(() => {
        this.isDeletingAppointment = false;
      });
  }

  handleSaveTimeBlock(blockData: TimeBlock) {
    const promise = blockData.id
      ? this.timeBlockService.updateTimeBlock(blockData)
      : this.timeBlockService.addTimeBlock(blockData);

    promise
      .then(() => {
        this.toastService.show('Horario bloqueado guardado con éxito', 'success');
        this.closeAllModals();
      })
      .catch(err => {
        this.toastService.show('Error al guardar el bloqueo', 'error');
        console.error(err);
      });
  }
  
  handleDeleteTimeBlock(blockId: string) {
    this.isDeletingBlock = true;
    this.timeBlockService.deleteTimeBlock(blockId)
      .then(() => {
        this.toastService.show('Bloqueo eliminado correctamente', 'success');
        this.closeAllModals();
      })
      .catch(err => {
        this.toastService.show('Error al eliminar el bloqueo', 'error');
        console.error(err);
      })
      .finally(() => {
        this.isDeletingBlock = false;
      });
  }
  
  closeAllModals() {
    this.showChoiceModal = false;
    this.showAppointmentModal = false;
    this.showTimeBlockModal = false;
    this.selectedDate = null;
    this.selectedAppointment = null;
    this.selectedTimeBlock = null;
    this.cdr.markForCheck();
  }
  
  previousWeek(): void { this.viewDate = subDays(this.viewDate, 7); }
  today(): void { this.viewDate = new Date(); }
  nextWeek(): void { this.viewDate = addDays(this.viewDate, 7); }
  loadWorkSchedule() { this.settingsService.getProfessionalProfile().subscribe(profile => { if (profile && profile.workSchedule) { this.processWorkSchedule(profile.workSchedule); } this.isCalendarReady = true; this.cdr.markForCheck(); }); }
  processWorkSchedule(schedule: WorkSchedule) { const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']; const excluded: number[] = []; let minHour = 24; let maxHour = 0; daysOfWeek.forEach((dayName, index) => { const dayConfig = schedule[dayName]; if (!dayConfig || !dayConfig.isActive || dayConfig.slots.length === 0) { excluded.push(index); } else { dayConfig.slots.forEach(slot => { const start = parseInt(slot.start.split(':')[0]); const end = parseInt(slot.end.split(':')[0]); if (start < minHour) minHour = start; if (end > maxHour) maxHour = end; }); } }); this.excludeDays = excluded; this.dayStartHour = Math.max(0, minHour - 1); this.dayEndHour = Math.min(23, maxHour + 1); }
}