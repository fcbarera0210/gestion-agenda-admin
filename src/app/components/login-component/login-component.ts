import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth-service';
import { Router, RouterLink } from '@angular/router';
import { ToastContainerComponent } from '../toast-container-component/toast-container-component';
import { ToastService } from '../../services/toast-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ToastContainerComponent],
  templateUrl: './login-component.html',
  styleUrls: ['./login-component.scss'],
})
export class LoginComponent {
  formLogin: FormGroup;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.formLogin = new FormGroup({
      email: new FormControl(),
      password: new FormControl()
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
}