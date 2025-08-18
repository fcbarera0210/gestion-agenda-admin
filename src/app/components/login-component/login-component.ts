import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth-service';
import { Router, RouterLink } from '@angular/router';
import { ToastContainerComponent } from '../toast-container-component/toast-container-component';
import { ToastService } from '../../services/toast-service';
import { ForgotPasswordModalComponent } from '../forgot-password-modal-component/forgot-password-modal-component';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ToastContainerComponent, ForgotPasswordModalComponent],
  templateUrl: './login-component.html',
  styleUrls: ['./login-component.scss'],
})
export class LoginComponent {
  formLogin: FormGroup;
  showForgotPasswordModal = false;
  isLoadingPasswordReset = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private themeService: ThemeService
  ) {
    this.formLogin = new FormGroup({
      email: new FormControl(),
      password: new FormControl()
    });
  }

  openForgotPasswordModal(): void {
    this.showForgotPasswordModal = true;
  }

  closeForgotPasswordModal(): void {
    this.showForgotPasswordModal = false;
  }

  handlePasswordReset(email: string): void {
    this.isLoadingPasswordReset = true;
    this.authService.sendPasswordResetEmail(email)
      .then(() => {
        this.toastService.show('Enlace enviado. Revisa tu correo.', 'success');
        this.closeForgotPasswordModal();
      })
      .catch((error) => {
        this.toastService.show('Error al enviar el correo.', 'error');
        console.error(error);
      }).finally(() => {
        this.isLoadingPasswordReset = false;
      });
  }

  onSubmit() {
    this.authService.login(this.formLogin.value)
      .then(response => {
        console.log(response);
        this.toastService.show('Inicio de sesión exitoso', 'success');
        this.router.navigate(['/dashboard']);
      })
      .catch((error) => {
          this.toastService.show('Correo o contraseña incorrectos', 'error');
          console.error(error);
        }
      );
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}