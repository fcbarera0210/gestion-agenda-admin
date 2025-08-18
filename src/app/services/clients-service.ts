import { Injectable } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, addDoc, collectionData, query, where, doc, updateDoc, deleteDoc, runTransaction, serverTimestamp, writeBatch } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// Interfaz para el cliente
export interface Client {
  id?: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  professionalId?: string;
  createdAt?: any;
}

// Interfaz para la entrada de historial
export interface HistoryEntry {
  id?: string;
  timestamp: any; // Usaremos serverTimestamp() de Firestore
  userId: string;
  action: 'Creación' | 'Actualización';
  changes: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientsService {

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) { }

  // Obtener todos los clientes del profesional (sin cambios)
  getClients(): Observable<Client[]> {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) return of([]);
        const clientsRef = collection(this.firestore, 'clients');
        const q = query(clientsRef, where('professionalId', '==', user.uid));
        return collectionData(q, { idField: 'id' }) as Observable<Client[]>;
      })
    );
  }

  // Añadir un nuevo cliente con su primera entrada de historial
  async addClient(client: Omit<Client, 'id' | 'professionalId'>): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error("No hay un usuario autenticado.");

    const batch = writeBatch(this.firestore);

    // 1. Referencia al nuevo documento de cliente
    const clientDocRef = doc(collection(this.firestore, 'clients'));

    // 2. Referencia al nuevo documento de historial
    const historyDocRef = doc(collection(clientDocRef, 'history'));

    // 3. Añadir el cliente al batch
    batch.set(clientDocRef, {
      ...client,
      professionalId: user.uid
    });

    // 4. Añadir la entrada de historial al batch
    const historyEntry: Omit<HistoryEntry, 'id'> = {
      timestamp: serverTimestamp(),
      userId: user.uid,
      action: 'Creación',
      changes: 'Cliente registrado en el sistema.'
    };
    batch.set(historyDocRef, historyEntry);

    // 5. Ejecutar todas las operaciones atómicamente
    await batch.commit();
  }

  // Actualizar un cliente y registrar los cambios detallados
  async updateClient(client: Client): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error("No hay un usuario autenticado.");
    if (!client.id) throw new Error("El ID del cliente es requerido para actualizar.");

    const clientDocRef = doc(this.firestore, `clients/${client.id}`);
    
    await runTransaction(this.firestore, async (transaction) => {
      const clientDoc = await transaction.get(clientDocRef);
      if (!clientDoc.exists()) {
        throw new Error("El documento del cliente no existe.");
      }

      const oldData = clientDoc.data() as Client;
      let changesDescription = '';

      // Comparamos campo por campo para construir la descripción de cambios
      (Object.keys(client) as Array<keyof Client>).forEach(key => {
        if (key !== 'id' && key !== 'professionalId' && key !== 'createdAt' && oldData[key] !== client[key]) {
          changesDescription += `Se actualizó '${key}' de '${oldData[key] || ""}' a '${client[key]}'.\n`;
        }
      });

      if (changesDescription) {
        // Si hubo cambios, registramos en el historial
        const historyDocRef = doc(collection(clientDocRef, 'history'));
        const historyEntry: Omit<HistoryEntry, 'id'> = {
          timestamp: serverTimestamp(),
          userId: user.uid,
          action: 'Actualización',
          changes: changesDescription.trim()
        };
        transaction.set(historyDocRef, historyEntry);
      }
      
      // Actualizamos el documento del cliente
      const { id, ...dataToUpdate } = client;
      transaction.update(clientDocRef, dataToUpdate);
    });
  }

  // Eliminar un cliente (sin cambios)
  deleteClient(clientId: string): Promise<void> {
    const clientDocRef = doc(this.firestore, `clients/${clientId}`);
    return deleteDoc(clientDocRef);
    // Nota: La eliminación del historial asociado debe configurarse
    // con una Cloud Function de Firebase para que sea automática.
  }

  // Obtener el historial de un cliente específico
getHistory(clientId: string): Observable<HistoryEntry[]> {
  const historyRef = collection(this.firestore, `clients/${clientId}/history`);
  const q = query(historyRef); // Podrías ordenar por fecha aquí si quieres
  return collectionData(q, { idField: 'id' }) as Observable<HistoryEntry[]>;
}
}