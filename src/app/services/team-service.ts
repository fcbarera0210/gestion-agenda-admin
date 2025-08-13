import { Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { from, Observable, of } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth'; // 👈 Importa Auth
import { Firestore, collection, query, where, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore'; // 👈 Importa Firestore
import { switchMap } from 'rxjs/operators';

// Creamos una interfaz para los miembros del equipo
export interface TeamMember {
  id?: string;
  displayName: string;
  email: string;
  role: 'admin' | 'member';
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {

  constructor(
    private functions: Functions,
    private auth: Auth, // 👈 Inyecta
    private firestore: Firestore // 👈 Inyecta
  ) { }

  // El método de invitar ya no es necesario aquí, lo dejamos por si lo usamos después
  inviteNewUser(email: string): Observable<any> {
    const createUserFn = httpsCallable(this.functions, 'createUser');
    return from(createUserFn({ email }));
  }

  getTeamMembers(): Observable<TeamMember[]> {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) return of([]);

        const professionalsRef = collection(this.firestore, 'professionals');
        // Buscamos a todos los que tengan el teamId del usuario actual
        // O cuyo propio UID sea el teamId (para incluir al admin)
        const q = query(professionalsRef, where('teamId', '==', user.uid));
        
        return collectionData(q, { idField: 'id' }) as Observable<TeamMember[]>;
      })
    );
  }

  updateMemberRole(memberId: string, newRole: 'admin' | 'member'): Promise<void> {
    const memberDocRef = doc(this.firestore, `professionals/${memberId}`);
    return updateDoc(memberDocRef, { role: newRole });
  }

  deleteTeamMember(memberId: string): Promise<void> {
    const memberDocRef = doc(this.firestore, `professionals/${memberId}`);
    return deleteDoc(memberDocRef);
  }
}