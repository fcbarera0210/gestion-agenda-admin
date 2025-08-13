# Panel de Administración - Gestión de Agenda Profesional

Este proyecto es el panel de administración para un sistema completo de gestión de clientes (CRM) y agendamiento de horas, diseñado para profesionales independientes.

**Proyecto en vivo:** [https://gestion-agenda-pro.web.app](https://gestion-agenda-pro.web.app)

---

## 📋 Sobre el Proyecto

Esta aplicación permite a un profesional gestionar todos los aspectos de su negocio de manera centralizada. Es la base para un futuro portal de clientes donde los usuarios finales podrán agendar horas de forma autónoma.

### ✨ Características Implementadas

* **Dashboard Principal:** Vista rápida de la actividad diaria y estadísticas clave.
* **Gestión de Agenda:** Un calendario semanal interactivo para crear, editar, eliminar y visualizar citas y bloqueos de tiempo.
* **Gestión de Clientes:** CRUD completo para la base de datos de clientes, con historial de cambios y de citas.
* **Gestión de Servicios:** Creación y administración de los servicios ofrecidos por el profesional.
* **Ajustes Avanzados:**
    * Configuración de perfil profesional.
    * Definición de horario laboral y descansos.
    * Gestión de equipo con sistema de invitaciones por código.
    * Cambio de contraseña seguro con re-autenticación.
* **Autenticación Segura:** Sistema de roles (admin/miembro) y control de acceso a funcionalidades.

---

## 🛠️ Construido Con

* **Framework Principal:** [Angular](https://angular.io/) (Standalone Components)
* **Backend y Base de Datos:** [Firebase](https://firebase.google.com/) (Firestore, Authentication, Hosting)
* **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
* **Librería de Calendario:** [angular-calendar](https://mattlewis92.github.io/angular-calendar/docs/)
* **Manejo de Fechas:** [date-fns](https://date-fns.org/)

---

## 🚀 Cómo Empezar

Para levantar una copia local del proyecto, sigue estos pasos.

### Prerrequisitos

* Node.js (v18 o superior)
* Angular CLI: `npm install -g @angular/cli`
* Firebase CLI: `npm install -g firebase-tools`

### Instalación

1.  Clona el repositorio:
    ```sh
    git clone [https://github.com/fcbarera0210/gestion-agenda-admin.git](https://github.com/fcbarera0210/gestion-agenda-admin.git)
    ```
2.  Navega a la carpeta del proyecto:
    ```sh
    cd gestion-agenda-admin
    ```
3.  Instala las dependencias de NPM:
    ```sh
    npm install
    ```
4.  Configura tus variables de entorno de Firebase en `src/environments/environment.ts`.
5.  Levanta el servidor de desarrollo:
    ```sh
    ng serve -o
    ```

---

## 🛣️ Hoja de Ruta (Roadmap)

* [ X ] Implementar notificaciones por correo con EmailJS.
* [ ] Añadir buscador a los selectores de clientes y servicios.
* [ ] Implementar "Recordarme" en el login.
* [ ] **(Gran Siguiente Paso)** Desarrollar el portal del cliente para el agendamiento público.