import { Injectable } from '@angular/core';
// 👇 1. Importa 'authState' desde @angular/fire/auth
import { Auth, authState } from '@angular/fire/auth';
import { doc, docData, Firestore, updateDoc } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// Definimos las interfaces para nuestro modelo de datos de horario
export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  isActive: boolean;
  slots: TimeSlot[];
}

export interface WorkSchedule {
  [day: string]: DaySchedule;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) { }

  // Obtiene el perfil del profesional, incluyendo su horario
  getProfessionalProfile(): Observable<any> {
    // 👇 2. Llama a authState() como una función, pasándole this.auth
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) {
          return of(null); // Si no hay usuario, no hay perfil
        }
        const userDocRef = doc(this.firestore, `professionals/${user.uid}`);
        return docData(userDocRef);
      })
    );
  }

  // Actualiza el horario de trabajo del profesional
  updateWorkSchedule(schedule: WorkSchedule): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return Promise.reject(new Error("Usuario no autenticado."));
    }
    const userDocRef = doc(this.firestore, `professionals/${user.uid}`);
    return updateDoc(userDocRef, {
      workSchedule: schedule
    });
  }
}