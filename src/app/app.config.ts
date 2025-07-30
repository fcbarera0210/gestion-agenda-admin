import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { provideAnimations } from '@angular/platform-browser/animations';

import { registerLocaleData } from '@angular/common'; // 👈 2. Importa registerLocaleData
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es' }, 
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    provideRouter(routes), provideFirebaseApp(() => initializeApp({ projectId: "gestion-agenda-pro", appId: "1:135115227347:web:85880d4f669d90359f5426", storageBucket: "gestion-agenda-pro.firebasestorage.app", apiKey: "AIzaSyCrVIIKMjAOhcGqihB7lRrB9T9TVolPR0c", authDomain: "gestion-agenda-pro.firebaseapp.com", messagingSenderId: "135115227347" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore()), provideFunctions(() => getFunctions())
  ]
};
