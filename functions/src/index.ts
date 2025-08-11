import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

admin.initializeApp();
const db = admin.firestore();

sgMail.setApiKey(functions.config().sendgrid.key);

export const sendAppointmentConfirmation = functions.firestore
  .document("appointments/{appointmentId}")
  .onCreate(async (snap) => {
    const apt = snap.data();
    if (!apt) return;

    try {
      const clientDoc = await db.collection("clients").doc(apt.clientId).get();
      const profDoc = await db.collection("professionals")
        .doc(apt.professionalId).get();
      const client = clientDoc.data();
      const prof = profDoc.data();

      if (!client || !prof) {
        console.log("Datos de cliente o profesional no encontrados.");
        return;
      }

      const date = apt.start.toDate();
      const fDate = date.toLocaleDateString("es-ES",
        {weekday: "long", year: "numeric", month: "long", day: "numeric"});
      const fTime = date.toLocaleTimeString("es-ES",
        {hour: "2-digit", minute: "2-digit"});

      const msg = {
        to: client.email,
        from: "kroobs0210@gmail.com",
        subject: `Confirmación de tu cita para ${apt.title}`,
        html: `<h1>¡Tu cita está confirmada!</h1>
        <p>Hola ${client.name},</p>
        <p>Confirmamos tu cita para <strong>${apt.title}</strong>.</p>
        <p><strong>Fecha:</strong> ${fDate}</p>
        <p><strong>Hora:</strong> ${fTime}</p>
        <p>¡Te esperamos!</p>`,
      };
      await sgMail.send(msg);
      console.log("Correo enviado a:", client.email);
    } catch (error) {
      console.error("Error al enviar correo:", error);
    }
  });

export const createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debes estar autenticado.",
    );
  }
  const email = data.email;
  if (!email) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El email es requerido.",
    );
  }

  try {
    const tempPassword = Math.random().toString(36).slice(-8);
    const userRecord = await admin.auth().createUser({
      email: email,
      password: tempPassword,
      emailVerified: true,
    });

    await db.collection("professionals").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: email,
      workSchedule: {},
    });

    const msg = {
      to: email,
      from: "kroobs0210@gmail.com",
      subject: "Bienvenido a la plataforma de gestión",
      html: `<p>Se ha creado una cuenta para ti.</p>
      <p>Contraseña temporal: <strong>${tempPassword}</strong></p>
      <p>Te recomendamos cambiarla al iniciar sesión.</p>`,
    };
    await sgMail.send(msg);

    return {result: `Usuario ${userRecord.email} creado.`};
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError(
        "already-exists",
        "Este correo ya está registrado.",
      );
    }
    throw new functions.https.HttpsError(
      "internal",
      "Ocurrió un error al crear el usuario.",
    );
  }
});
