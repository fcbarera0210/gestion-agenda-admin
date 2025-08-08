import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, getDoc, updateDoc, where, getDocs, query } from '@angular/fire/firestore';

export interface Invitation {
  id?: string;
  code: string;
  createdAt: Date;
  used: boolean;
  usedBy?: string; // Email de quien usó el código
}

@Injectable({
  providedIn: 'root'
})
export class InvitationService {

  constructor(private firestore: Firestore) { }

  /**
   * Genera un código de invitación único y lo guarda en Firestore.
   */
  async createInvitationCode(): Promise<string> {
    // Genera un código simple y aleatorio (ej. ABCDE-12345)
    const code = (Math.random().toString(36).substring(2, 7) + '-' + Math.random().toString(36).substring(2, 7)).toUpperCase();

    const invitationsRef = collection(this.firestore, 'invitations');
    await addDoc(invitationsRef, {
      code: code,
      createdAt: new Date(),
      used: false
    });

    return code;
  }

  async validateAndUseCode(code: string, userEmail: string): Promise<string | null> {
    const invitationsRef = collection(this.firestore, 'invitations');
    const q = query(invitationsRef, where('code', '==', code), where('used', '==', false));

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // El código no existe o ya fue usado
      return null;
    }

    // El código es válido, lo marcamos como usado
    const invitationDoc = querySnapshot.docs[0];
    await updateDoc(invitationDoc.ref, {
      used: true,
      usedBy: userEmail,
    });

    return invitationDoc.id;
  }

  // (Añadiremos los métodos para validar y usar el código más adelante,
  // cuando modifiquemos la página de registro)
}