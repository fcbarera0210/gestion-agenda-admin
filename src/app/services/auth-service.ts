import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
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

  async register({ email, password, invitationCode }: any) { 
    const isValidCode = await this.invitationService.validateAndUseCode(invitationCode, email);

    if (!isValidCode) {
      throw new Error("El código de invitación no es válido o ya ha sido utilizado.");
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);

      const user = userCredential.user;
      const userDocRef = doc(this.firestore, `professionals/${user.uid}`);

      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: email,
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