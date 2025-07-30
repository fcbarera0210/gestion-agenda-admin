import { Injectable } from '@angular/core';
// 👇 1. Importa 'authState' desde @angular/fire/auth
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, addDoc, collectionData, query, where, doc, deleteDoc, Timestamp, updateDoc } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// Interfaz para el objeto de Bloqueo de Tiempo
export interface TimeBlock {
  id?: string;
  professionalId?: string;
  start: Timestamp;
  end: Timestamp;
  title: string; // ej. "Almuerzo", "Cita Médica"
  color?: {
    primary: string;
    secondary: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TimeBlockService {

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) { }

  // Obtiene todos los bloqueos del profesional que ha iniciado sesión
  getTimeBlocks(): Observable<TimeBlock[]> {
    // 👇 2. Llama a authState() como una función, pasándole this.auth
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }
        const blocksRef = collection(this.firestore, 'timeBlocks');
        const q = query(blocksRef, where('professionalId', '==', user.uid));
        return collectionData(q, { idField: 'id' }) as Observable<TimeBlock[]>;
      })
    );
  }

  // Añadir un nuevo bloqueo de tiempo
  addTimeBlock(blockData: Omit<TimeBlock, 'id' | 'professionalId'>): Promise<any> {
    const user = this.auth.currentUser;
    if (!user) {
      return Promise.reject(new Error("No hay un usuario autenticado."));
    }
    const blocksRef = collection(this.firestore, 'timeBlocks');
    return addDoc(blocksRef, {
      ...blockData,
      professionalId: user.uid
    });
  }

  // Eliminar un bloqueo de tiempo
  deleteTimeBlock(blockId: string): Promise<void> {
    const blockDocRef = doc(this.firestore, `timeBlocks/${blockId}`);
    return deleteDoc(blockDocRef);
  }

  updateTimeBlock(block: TimeBlock): Promise<void> {
    const blockDocRef = doc(this.firestore, `timeBlocks/${block.id}`);
    const { id, ...dataToUpdate } = block;
    return updateDoc(blockDocRef, dataToUpdate);
  }
}