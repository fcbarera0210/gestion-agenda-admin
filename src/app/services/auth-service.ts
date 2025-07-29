import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private auth: Auth,
    private firestore: Firestore // 👈 1. Inyecta Firestore
  ) { }

  async register({ email, password }: any) {
    // 2. Convertimos la función en async para usar await
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // 3. Justo después de crear el usuario, creamos su documento en Firestore
      const user = userCredential.user;
      const userDocRef = doc(this.firestore, `professionals/${user.uid}`);
      
      // 4. Usamos setDoc para crear el documento con datos iniciales
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        workSchedule: {} // Creamos el objeto vacío para el horario
      });

      return userCredential;

    } catch (error) {
      console.error("Error en el registro: ", error);
      throw error; // Re-lanzamos el error para que el componente lo pueda atrapar
    }
  }

  login({ email, password }: any) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    return signOut(this.auth);
  }
}