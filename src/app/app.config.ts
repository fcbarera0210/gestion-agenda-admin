import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), provideFirebaseApp(() => initializeApp({ projectId: "gestion-agenda-pro", appId: "1:135115227347:web:85880d4f669d90359f5426", storageBucket: "gestion-agenda-pro.firebasestorage.app", apiKey: "AIzaSyCrVIIKMjAOhcGqihB7lRrB9T9TVolPR0c", authDomain: "gestion-agenda-pro.firebaseapp.com", messagingSenderId: "135115227347" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore()), provideFunctions(() => getFunctions())
  ]
};
