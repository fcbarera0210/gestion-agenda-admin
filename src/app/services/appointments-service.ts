import { Injectable } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, addDoc, collectionData, query, where, doc, updateDoc, deleteDoc, Timestamp } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled';

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
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) { }

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
}