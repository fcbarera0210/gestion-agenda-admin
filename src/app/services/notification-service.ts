import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor() {
    // Configura EmailJS con tu clave pública
    emailjs.init({
      publicKey: 'VJw7HPRhQEHP1OFer', // 👈 Reemplaza con tu Public Key de EmailJS
    });
  }

  /**
   * Envía un correo de confirmación de cita.
   */
  async sendAppointmentConfirmation(params: any): Promise<void> {
    try {
      await emailjs.send(
        'service_v05sxup', // 👈 Reemplaza con tu Service ID
        'template_vig0r7t', // 👈 Reemplaza con tu Template ID
        params
      );
      console.log('Correo de confirmación enviado con éxito.');
    } catch (error) {
      console.error('Error al enviar el correo con EmailJS:', error);
      // Opcional: podrías usar el ToastService aquí para notificar un fallo
    }
  }
}