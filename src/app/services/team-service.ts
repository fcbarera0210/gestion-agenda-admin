import { Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TeamService {

  constructor(private functions: Functions) { }

  /**
   * Llama a la Cloud Function 'createUser' para invitar a un nuevo usuario.
   * @param email El correo del nuevo usuario.
   */
  inviteNewUser(email: string): Observable<any> {
    const createUserFn = httpsCallable(this.functions, 'createUser');
    return from(createUserFn({ email }));
  }
}