import {firestore} from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";
import {config} from "firebase-functions";

// Inicializa la app de Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Configura la API Key de SendGrid
sgMail.setApiKey(config().sendgrid.key);

/**
 * Se activa cuando se crea una nueva cita (usando sintaxis v1 explícita).
 */
export const sendAppointmentConfirmation = firestore
  .document("appointments/{appointmentId}")
  .onCreate(async (snap) => {
    const newAppointment = snap.data();

    if (!newAppointment) {
      console.log("No hay datos en la cita.");
      return;
    }

    try {
      const clientDoc = await db
        .collection("clients")
        .doc(newAppointment.clientId)
        .get();
      const clientData = clientDoc.data();

      const professionalDoc = await db
        .collection("professionals")
        .doc(newAppointment.professionalId)
        .get();
      const professionalData = professionalDoc.data();

      if (!clientData || !professionalData) {
        console.log("No se encontraron datos del cliente o profesional.");
        return;
      }

      const appointmentDate = newAppointment.start.toDate();
      const formattedDate = appointmentDate.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = appointmentDate.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const msg = {
        to: clientData.email,
        from: "tu-correo-verificado@dominio.com", // 👈 ¡Recuerda reemplazar!
        subject: `Confirmación de tu cita para ${newAppointment.title}`,
        html: `
          <h1>¡Tu cita está confirmada!</h1>
          <p>Hola ${clientData.name},</p>
          <p>
            Te confirmamos tu cita para el servicio de
            <strong>${newAppointment.title}</strong>.
          </p>
          <p><strong>Fecha:</strong> ${formattedDate}</p>
          <p><strong>Hora:</strong> ${formattedTime}</p>
          <p>¡Te esperamos!</p>
        `,
      };

      await sgMail.send(msg);
      console.log("Correo enviado exitosamente a:", clientData.email);
    } catch (error) {
      console.error("Error al enviar el correo:", error);
    }
  });
