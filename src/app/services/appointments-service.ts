import { Injectable } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, addDoc, collectionData, query, where, doc, updateDoc, deleteDoc, Timestamp, orderBy } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import emailjs from '@emailjs/browser';

export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled';

export type AppointmentType = 'presencial' | 'online';

// Interfaz para el objeto de Cita
export interface Appointment {
  id?: string;
  professionalId?: string;
  clientId: string;
  serviceId: string;
  start: Timestamp;
  end: Timestamp;
  title: string;
  color?: {
    primary: string;
    secondary: string;
  };
  status: AppointmentStatus;
  type: AppointmentType;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {
    emailjs.init({
      publicKey: 'VJw7HPRhQEHP1OFer', 
    });
  }

  async sendConfirmationEmail(appointmentData: any, clientData: any, professionalData: any): Promise<void> {
    const appointmentDate = appointmentData.start.toDate();
    const templateParams = {
      client_name: clientData.name,
      service_name: appointmentData.title,
      date: appointmentDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: appointmentDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      professional_name: professionalData.displayName,
      reply_to: clientData.email,
    };

    try {
      await emailjs.send(
        'service_v05sxup', // 👈 Reemplaza con tu Service ID de EmailJS
        'template_vig0r7t', // 👈 Reemplaza con tu Template ID
        templateParams
      );
      console.log('Correo de confirmación enviado exitosamente.');
    } catch (error) {
      console.error('Error al enviar el correo con EmailJS:', error);
    }
  }

  // Obtiene todas las citas del profesional que ha iniciado sesión
  getAppointments(): Observable<Appointment[]> {
    return authState(this.auth).pipe(
          switchMap(user => {
            if (!user) return of([]);
            const clientsRef = collection(this.firestore, 'appointments');
            const q = query(clientsRef, where('professionalId', '==', user.uid));
            return collectionData(q, { idField: 'id' }) as Observable<Appointment[]>;
          })
        );
  }

  // Añadir una nueva cita
  addAppointment(appointmentData: Omit<Appointment, 'id' | 'professionalId'>): Promise<any> {
    const user = this.auth.currentUser;
    if (!user) {
      return Promise.reject(new Error("No hay un usuario autenticado."));
    }
    const appointmentsRef = collection(this.firestore, 'appointments');
    return addDoc(appointmentsRef, {
      ...appointmentData,
      professionalId: user.uid // Vincula la cita al profesional actual
    });
  }

  // Actualizar una cita existente
  updateAppointment(appointment: Appointment): Promise<void> {
    const appointmentDocRef = doc(this.firestore, `appointments/${appointment.id}`);
    const { id, ...dataToUpdate } = appointment;
    return updateDoc(appointmentDocRef, dataToUpdate);
  }

  // Eliminar una cita
  deleteAppointment(appointmentId: string): Promise<void> {
    const appointmentDocRef = doc(this.firestore, `appointments/${appointmentId}`);
    return deleteDoc(appointmentDocRef);
  }

  getAppointmentsForClient(clientId: string): Observable<Appointment[]> {
    const appointmentsRef = collection(this.firestore, 'appointments');
    // Creamos una consulta que filtra por clientId y ordena por la fecha de inicio descendente
    const q = query(
      appointmentsRef, 
      where('clientId', '==', clientId),
      orderBy('start', 'desc') // Muestra las más recientes primero
    );
    return collectionData(q, { idField: 'id' }) as Observable<Appointment[]>;
  }
}