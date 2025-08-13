import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, addDoc, doc, getDoc, updateDoc, where, getDocs, query, collectionData, Timestamp } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators'; 

export interface Invitation {
  id?: string;
  code: string;
  createdAt: any;
  used: boolean;
  usedBy?: string; // Email de quien usó el código
}

@Injectable({
  providedIn: 'root'
})
export class InvitationService {

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) { }

  /**
   * Genera un código de invitación único y lo guarda en Firestore.
   */
  async createInvitationCode(): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error("Debes estar autenticado para generar un código.");

    // Genera un código simple y aleatorio (ej. ABCDE-12345)
    const code = (Math.random().toString(36).substring(2, 7) + '-' + Math.random().toString(36).substring(2, 7)).toUpperCase();

    const invitationsRef = collection(this.firestore, 'invitations');
    await addDoc(invitationsRef, {
      code: code,
      createdAt: new Date(),
      used: false,
      createdBy: user.uid 
    });

    return code;
  }

  async validateAndUseCode(code: string, userEmail: string): Promise<string | null> {
    const invitationsRef = collection(this.firestore, 'invitations');
    const q = query(invitationsRef, where('code', '==', code), where('used', '==', false));
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const invitationDoc = querySnapshot.docs[0];
    await updateDoc(invitationDoc.ref, {
      used: true,
      usedBy: userEmail,
    });

    return invitationDoc.data()['createdBy'] || null;
  }

  getPendingInvitations(): Observable<Invitation[]> {
    const user = this.auth.currentUser;
    if (!user) {
      return of([]);
    }

    const invitationsRef = collection(this.firestore, 'invitations');
    const q = query(
      invitationsRef,
      where('createdBy', '==', user.uid),
      where('used', '==', false)
    );
    
    return (collectionData(q, { idField: 'id' }) as Observable<Invitation[]>).pipe(
      // 👇 Añadimos este 'pipe' para transformar los datos
      map(invitations => invitations.map(inv => {
        // Convertimos el Timestamp de Firestore a una Date de JavaScript
        const createdAtDate = (inv.createdAt as Timestamp).toDate();
        return { ...inv, createdAt: createdAtDate };
      }))
    );
  }
}