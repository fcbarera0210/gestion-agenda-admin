import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc, runTransaction, serverTimestamp, writeBatch, query } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

// Interfaz para el servicio
export interface Service {
  id?: string;
  name: string;
  duration: number;
  price: number;
  bufferTime: number;
}

// Interfaz para la entrada de historial (idéntica a la de clientes)
export interface HistoryEntry {
  id?: string;
  timestamp: any;
  userId: string;
  action: 'Creación' | 'Actualización';
  changes: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServicesService {

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) { }

  // Obtener todos los servicios (sin cambios)
  getServices(): Observable<Service[]> {
    const servicesRef = collection(this.firestore, 'services');
    return collectionData(servicesRef, { idField: 'id' }) as Observable<Service[]>;
  }

  // Añadir un nuevo servicio con su entrada de historial
  async addService(service: Service): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error("No hay un usuario autenticado.");

    const batch = writeBatch(this.firestore);
    const serviceDocRef = doc(collection(this.firestore, 'services'));
    const historyDocRef = doc(collection(serviceDocRef, 'history'));

    batch.set(serviceDocRef, service);
    batch.set(historyDocRef, {
      timestamp: serverTimestamp(),
      userId: user.uid,
      action: 'Creación',
      changes: 'Servicio creado en el sistema.'
    });

    await batch.commit();
  }

  // Actualizar un servicio y registrar los cambios
  async updateService(service: Service): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !service.id) throw new Error("Usuario o ID de servicio no válidos.");

    const serviceDocRef = doc(this.firestore, `services/${service.id}`);

    await runTransaction(this.firestore, async (transaction) => {
      const serviceDoc = await transaction.get(serviceDocRef);
      if (!serviceDoc.exists()) throw new Error("El documento del servicio no existe.");

      const oldData = serviceDoc.data() as Service;
      let changesDescription = '';

      (Object.keys(service) as Array<keyof Service>).forEach(key => {
        if (key !== 'id' && oldData[key] !== service[key]) {
          changesDescription += `Se actualizó '${key}' de '${oldData[key] || ""}' a '${service[key]}'.\n`;
        }
      });

      if (changesDescription) {
        const historyDocRef = doc(collection(serviceDocRef, 'history'));
        transaction.set(historyDocRef, {
          timestamp: serverTimestamp(),
          userId: user.uid,
          action: 'Actualización',
          changes: changesDescription.trim()
        });
      }
      
      const { id, ...dataToUpdate } = service;
      transaction.update(serviceDocRef, dataToUpdate);
    });
  }
  
  // Eliminar un servicio (sin cambios)
  deleteService(serviceId: string) {
    const serviceDocRef = doc(this.firestore, `services/${serviceId}`);
    return deleteDoc(serviceDocRef);
  }

  // Obtener el historial de un servicio específico
  getHistory(serviceId: string): Observable<HistoryEntry[]> {
    const historyRef = collection(this.firestore, `services/${serviceId}/history`);
    const q = query(historyRef);
    return collectionData(q, { idField: 'id' }) as Observable<HistoryEntry[]>;
  }
}