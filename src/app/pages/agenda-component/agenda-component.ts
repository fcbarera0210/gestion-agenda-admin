import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarModule, DateAdapter, CalendarEvent } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { es } from 'date-fns/locale/es';
import { map, combineLatest, firstValueFrom, BehaviorSubject, Subscription } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import { addDays, getDay, setHours, setMinutes, startOfWeek, subDays } from 'date-fns';

// Componentes y Servicios
import { SettingsService, WorkSchedule } from '../../services/settings-service';
import { Appointment, AppointmentsService } from '../../services/appointments-service';
import { ClientsService } from '../../services/clients-service';
import { TimeBlock, TimeBlockService } from '../../services/time-block-service';
import { AppointmentFormComponent } from '../../components/appointment-form-component/appointment-form-component';
import { TimeBlockFormComponent } from '../../components/time-block-form-component/time-block-form-component';
import { ToastService } from '../../services/toast-service';
import { NotificationService } from '../../services/notification-service';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarModule, AppointmentFormComponent, TimeBlockFormComponent],
  templateUrl: './agenda-component.html',
  styleUrls: ['./agenda-component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaComponent implements OnInit, OnDestroy {

  // --- Propiedades del Calendario ---
  locale: string = 'es';
  viewDate: Date = new Date();
  viewDate$ = new BehaviorSubject<Date>(this.viewDate);
  events: CalendarEvent<Appointment | TimeBlock>[] = [];
  excludeDays: number[] = [];
  dayStartHour = 8;
  dayEndHour = 20;
  isCalendarReady = false;
  isMobile = false;
  private eventsSub?: Subscription;

  // --- Propiedades de Estado de los Modales ---
  showChoiceModal = false;
  showAppointmentModal = false;
  showTimeBlockModal = false;
  selectedDate: Date | null = null;
  selectedAppointment: Appointment | null = null;
  selectedTimeBlock: TimeBlock | null = null;
  isDeletingAppointment = false;
  isDeletingBlock = false;

  constructor(
    private settingsService: SettingsService,
    private appointmentsService: AppointmentsService,
    private clientsService: ClientsService,
    private timeBlockService: TimeBlockService,
    private toastService: ToastService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateIsMobile();
    window.addEventListener('resize', () => this.updateIsMobile());
    this.loadWorkSchedule();
    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.eventsSub?.unsubscribe();
  }

  updateIsMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  // --- Carga de Datos ---

  loadWorkSchedule(): void {
    this.settingsService.getProfessionalProfile().subscribe(profile => {
      if (profile && profile.workSchedule) {
        this.processWorkSchedule(profile.workSchedule);
      }
      this.isCalendarReady = true;
      this.cdr.markForCheck();
    });
  }

  loadEvents(): void {
    this.eventsSub?.unsubscribe();
    this.eventsSub = combineLatest([
      this.appointmentsService.getAppointments(),
      this.clientsService.getClients(),
      this.timeBlockService.getTimeBlocks(),
      this.settingsService.getProfessionalProfile(),
      this.viewDate$
    ]).pipe(
      map(([appointments, clients, timeBlocks, profile, viewDate]) => {
        const clientsMap = new Map(clients.map(client => [client.id, client.name]));
        
        const appointmentEvents = appointments.map(apt => ({
          start: apt.start.toDate(),
          end: apt.end.toDate(),
          title: `<b>${apt.title}</b><br>${clientsMap.get(apt.clientId) || 'Cliente Desconocido'}`,
          color: apt.color,
          meta: { ...apt, eventType: 'appointment' },
        }));

        const timeBlockEvents = timeBlocks.map(block => ({
          start: block.start.toDate(),
          end: block.end.toDate(),
          title: `<i>${block.title}</i>`,
          color: block.color,
          meta: { ...block, eventType: 'timeBlock' },
        }));

        const breakEvents: CalendarEvent[] = [];
        if (profile && profile.workSchedule) {
          const schedule: WorkSchedule = profile.workSchedule;
          const weekStartsOn = 1; // 1 = Lunes
          const startOfView = startOfWeek(viewDate, { weekStartsOn });
          const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

          for (let i = 0; i < 7; i++) {
            const dateInWeek = addDays(startOfView, i);
            const dayName = daysOfWeek[getDay(dateInWeek)];
            const daySchedule = schedule[dayName];

            if (daySchedule && daySchedule.isActive && daySchedule.breaks) {
              daySchedule.breaks.forEach(breakSlot => {
                const [startHour, startMinute] = breakSlot.start.split(':').map(Number);
                const [endHour, endMinute] = breakSlot.end.split(':').map(Number);

                breakEvents.push({
                  start: setMinutes(setHours(dateInWeek, startHour), startMinute),
                  end: setMinutes(setHours(dateInWeek, endHour), endMinute),
                  title: '<i>Descanso</i>',
                  color: { primary: '#6c757d', secondary: '#e9ecef' }, // Mismo color que los bloqueos
                  meta: { eventType: 'break' }, // Un tipo distinto por si lo necesitamos
                });
              });
            }
          }
        }
        
        return [...appointmentEvents, ...timeBlockEvents, ...breakEvents];
      })
    ).subscribe(calendarEvents => {
      this.events = calendarEvents;
      this.cdr.markForCheck();
    });
  }

  processWorkSchedule(schedule: WorkSchedule): void {
    const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const excluded: number[] = [];
    let minHour = 24;
    let maxHour = 0;

    daysOfWeek.forEach((dayName, index) => {
      const dayConfig = schedule[dayName];
      if (!dayConfig || !dayConfig.isActive || !dayConfig.workHours) {
        excluded.push(index);
      } else {
        const start = parseInt(dayConfig.workHours.start.split(':')[0]);
        const end = parseInt(dayConfig.workHours.end.split(':')[0]);
        if (start < minHour) minHour = start;
        if (end > maxHour) maxHour = end;
      }
    });

    this.excludeDays = excluded;
    this.dayStartHour = minHour === 24 ? 8 : Math.max(0, minHour - 1);
    this.dayEndHour = maxHour === 0 ? 20 : Math.min(23, maxHour + 1);
  }

  // --- Navegación del Calendario ---

  previousWeek(): void {
    this.viewDate = subDays(this.viewDate, this.isMobile ? 1 : 7);
    this.viewDate$.next(this.viewDate);
  }
  today(): void {
    this.viewDate = new Date();
    this.viewDate$.next(this.viewDate);
  }
  nextWeek(): void {
    this.viewDate = addDays(this.viewDate, this.isMobile ? 1 : 7);
    this.viewDate$.next(this.viewDate);
  }

  onDateChange(dateString: string): void {
    this.viewDate = new Date(dateString);
    this.viewDate$.next(this.viewDate);
  }

  // --- Manejadores de Eventos del Calendario ---

  onHourSegmentClicked(event: { date: Date }): void {
    this.selectedAppointment = null;
    this.selectedTimeBlock = null;
    this.selectedDate = new Date(event.date);
    this.showChoiceModal = true;
    this.cdr.markForCheck();
  }

  handleEventClicked({ event }: { event: CalendarEvent<any> }): void {
    if (event.meta.eventType === 'appointment') {
      this.selectedAppointment = event.meta;
      this.selectedDate = event.start;
      this.showAppointmentModal = true;
    } else if (event.meta.eventType === 'timeBlock') {
      this.selectedTimeBlock = event.meta;
      this.selectedDate = event.start;
      this.showTimeBlockModal = true;
    }
  }

  // --- Manejadores de Acciones de los Modales ---

  openAppointmentForm(): void {
    this.selectedAppointment = null;
    this.showChoiceModal = false;
    this.showAppointmentModal = true;
    this.cdr.markForCheck();
  }

  openTimeBlockForm(): void {
    this.showChoiceModal = false;
    this.showTimeBlockModal = true;
  }

  handleSaveAppointment(appointmentData: any): void {
    const isNewAppointment = !appointmentData.id;
    const promise = isNewAppointment
      ? this.appointmentsService.addAppointment(appointmentData)
      : this.appointmentsService.updateAppointment(appointmentData);

    promise
      .then(async () => { // 👈 Haz la función async
        this.toastService.show('Cita guardada con éxito', 'success');
        
        // 👇 Lógica para enviar el correo SOLO para citas nuevas
        if (isNewAppointment) {
          try {
            const clients = await firstValueFrom(this.clientsService.getClients());
            const clientData = clients.find(c => c.id === appointmentData.clientId);
            
            if (clientData) {
              const appointmentDate = appointmentData.start.toDate();
              const templateParams = {
                client_name: clientData.name,
                service_name: appointmentData.title,
                date: appointmentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
                time: appointmentDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                reply_to: clientData.email,
              };
              // No esperamos a que el correo se envíe para cerrar el modal
              this.notificationService.sendAppointmentConfirmation(templateParams);
            }
          } catch (error) {
            console.error("Error al preparar los datos para el email:", error);
          }
        }

        this.closeAllModals();
      })
      .catch(err => {
        this.toastService.show('Error al guardar la cita', 'error');
        console.error(err);
      });
  }

  handleDeleteAppointment(appointmentId: string): void {
    this.isDeletingAppointment = true;
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

  handleSaveTimeBlock(blockData: TimeBlock): void {
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
  
  handleDeleteTimeBlock(blockId: string): void {
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
  
  closeAllModals(): void {
    this.showChoiceModal = false;
    this.showAppointmentModal = false;
    this.showTimeBlockModal = false;
    this.selectedDate = null;
    this.selectedAppointment = null;
    this.selectedTimeBlock = null;
    this.cdr.markForCheck();
  }
}