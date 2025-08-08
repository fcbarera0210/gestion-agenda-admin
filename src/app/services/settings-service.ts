import { Injectable } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { doc, docData, Firestore, updateDoc } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface TimeSlot {
  start: string;
  end: string;
}

export interface ProfessionalProfile {
  displayName: string;
  title: string; // Ej: "Psicólogo Clínico"
  phone: string;
  address: string;
}

export interface DaySchedule {
  isActive: boolean;
  workHours: TimeSlot; // Un único horario laboral
  breaks: TimeSlot[];  // Una lista de descansos
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

  getProfessionalProfile(): Observable<any> {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) {
          return of(null);
        }
        const userDocRef = doc(this.firestore, `professionals/${user.uid}`);
        return docData(userDocRef);
      })
    );
  }

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

  updateProfile(profileData: Partial<ProfessionalProfile>): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return Promise.reject(new Error("Usuario no autenticado."));
    }
    const userDocRef = doc(this.firestore, `professionals/${user.uid}`);
    return updateDoc(userDocRef, profileData);
  }
}