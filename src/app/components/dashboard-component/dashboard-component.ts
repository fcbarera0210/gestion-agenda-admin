import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { startOfDay, endOfDay } from 'date-fns';

// Servicios
import { AuthService } from '../../services/auth-service';
import { AppointmentsService, Appointment } from '../../services/appointments-service';
import { ClientsService, Client } from '../../services/clients-service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, DatePipe],
  templateUrl: './dashboard-component.html',
})
export class DashboardComponent implements OnInit {

  upcomingAppointments$!: Observable<Appointment[]>;
  clientsMap = new Map<string, string>();
  stats = {
    totalClients: 0
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private appointmentsService: AppointmentsService,
    private clientsService: ClientsService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Combinamos la carga de clientes y citas
    this.upcomingAppointments$ = combineLatest([
      this.clientsService.getClients(),
      this.appointmentsService.getAppointments()
    ]).pipe(
      map(([clients, appointments]) => {
        // 1. Calculamos las estadísticas y creamos el mapa de clientes
        this.stats.totalClients = clients.length;
        this.clientsMap = new Map(clients.map(client => [client.id!, client.name]));

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

  onClick() {
    this.authService.logout()
      .then(() => {
        this.router.navigate(['/login']);
      })
      .catch(error => console.log(error));
  }
}