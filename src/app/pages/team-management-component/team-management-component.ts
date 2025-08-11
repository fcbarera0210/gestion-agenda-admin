import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../services/toast-service';
import { TeamService } from '../../services/team-service'; // Asegúrate de tener este servicio

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './team-management-component.html',
})
export class TeamManagementComponent implements OnInit {

  newUserForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private toastService: ToastService,
    private teamService: TeamService
  ) {
    this.newUserForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {}

  inviteUser(): void {
    if (this.newUserForm.invalid) return;

    this.isLoading = true;
    const email = this.newUserForm.value.email;

    this.teamService.inviteNewUser(email).subscribe({
      next: () => {
        this.toastService.show(`Invitación enviada a ${email}`, 'success');
        this.newUserForm.reset();
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
        console.error(error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}