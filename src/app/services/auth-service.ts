import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updatePassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { InvitationService } from './invitation-service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private invitationService: InvitationService
  ) { }

  sendPasswordResetEmail(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  changeUserPassword(newPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return Promise.reject(new Error("No hay un usuario autenticado."));
    }
    return updatePassword(user, newPassword);
  }

  async reauthenticateAndChangePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) {
      throw new Error("Usuario no encontrado o sin email.");
    }
    
    // 1. Crear la credencial con la contraseña actual
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    
    // 2. Re-autenticar al usuario
    await reauthenticateWithCredential(user, credential);
    
    // 3. Si la re-autenticación fue exitosa, ahora sí cambiamos la contraseña
    await updatePassword(user, newPassword);
  }

  async register({ email, password, invitationCode }: any) { 
    const adminId = await this.invitationService.validateAndUseCode(invitationCode, email);

    if (!adminId) {
      throw new Error("El código de invitación no es válido o ya ha sido utilizado.");
    }
    
    // 2. Creamos el usuario en el sistema de autenticación
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      const user = userCredential.user;
      const userDocRef = doc(this.firestore, `professionals/${user.uid}`);
      
      // 3. Creamos su perfil en Firestore, asignándole el teamId del admin que lo invitó
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: email,
        teamId: adminId, // Asignamos el equipo
        role: 'member',   // Le damos un rol de miembro
        workSchedule: {}
      });

      return userCredential;

    } catch (error) {
      console.error("Error en el registro: ", error);
      throw error;
    }
  }

  login({ email, password }: any) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    return signOut(this.auth);
  }
}