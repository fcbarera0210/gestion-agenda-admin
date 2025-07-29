import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

// Definimos una interfaz para tipar nuestros datos de servicio
export interface Service {
  id?: string;
  name: string;
  duration: number;
  price: number;
  bufferTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServicesService {

  constructor(private firestore: Firestore) { }

  // Añadir un nuevo servicio a Firestore
  addService(service: Service) {
    const servicesRef = collection(this.firestore, 'services');
    return addDoc(servicesRef, service);
  }

  // Obtener todos los servicios como un Observable
  getServices(): Observable<Service[]> {
    const servicesRef = collection(this.firestore, 'services');
    return collectionData(servicesRef, { idField: 'id' }) as Observable<Service[]>;
  }

  // Actualizar un servicio existente
  updateService(service: Service) {
    const serviceDocRef = doc(this.firestore, `services/${service.id}`);
    // Excluimos el 'id' del objeto que se guarda, ya que está en la ruta del documento
    const { id, ...dataToUpdate } = service; 
    return updateDoc(serviceDocRef, dataToUpdate);
  }

  // Eliminar un servicio
  deleteService(serviceId: string) {
    const serviceDocRef = doc(this.firestore, `services/${serviceId}`);
    return deleteDoc(serviceDocRef);
  }
}