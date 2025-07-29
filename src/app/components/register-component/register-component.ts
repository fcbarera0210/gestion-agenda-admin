import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth-service';
import { Router } from '@angular/router';
import { ToastContainerComponent } from '../toast-container-component/toast-container-component';
import { ToastService } from '../../services/toast-service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, ToastContainerComponent],
  templateUrl: './register-component.html',
  styleUrls: ['./register-component.scss']
})
export class RegisterComponent {
  formReg: FormGroup;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.formReg = new FormGroup({
      email: new FormControl(),
      password: new FormControl()
    })
  }

  onSubmit() {
    this.authService.register(this.formReg.value)
      .then(response => {
        console.log(response);
        this.toastService.show('¡Registro exitoso! Ahora puedes iniciar sesión', 'success');
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        this.toastService.show('Error en el registro. Inténtalo de nuevo.', 'error');
        console.log(error);
      });
  }
}