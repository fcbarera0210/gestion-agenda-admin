import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth-service';
import { Router, RouterLink } from '@angular/router';
import { ToastContainerComponent } from '../toast-container-component/toast-container-component';
import { ToastService } from '../../services/toast-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastContainerComponent, RouterLink],
  templateUrl: './register-component.html',
  styleUrls: ['./register-component.scss']
})
export class RegisterComponent {
  formReg: FormGroup;
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.formReg = new FormGroup({
      email: new FormControl(),
      password: new FormControl(),
      invitationCode: new FormControl('', Validators.required)
    })
  }

  onSubmit() {
     if (this.formReg.invalid) {
      this.toastService.show('Por favor, completa todos los campos.', 'error');
      return;
    }

    this.isLoading = true; // 👈 Inicia la carga
    this.authService.register(this.formReg.value)
      .then(() => {
        this.toastService.show('¡Registro exitoso! Ahora puedes iniciar sesión', 'success');
        this.router.navigate(['/login']);
      })
      .catch(error => {
        this.toastService.show(error.message, 'error');
        console.error(error);
      })
      .finally(() => {
        this.isLoading = false; // 👈 Finaliza la carga
      });
  }
}