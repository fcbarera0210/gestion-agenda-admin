import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../services/toast-service';
import { TeamService, TeamMember } from '../../services/team-service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-team-management',
  standalone: true, // 👈 Se asegura que sea un componente standalone
  imports: [CommonModule, ReactiveFormsModule], // 👈 Importa los módulos necesarios
  templateUrl: './team-management-component.html',
})
export class TeamManagementComponent implements OnInit {
  teamMembers$: Observable<TeamMember[]>
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
    this.teamMembers$ = this.teamService.getTeamMembers();
  }

  ngOnInit(): void {}

  inviteUser(): void {
    if (this.newUserForm.invalid) {
      return;
    }

    this.isLoading = true;
    const email = this.newUserForm.value.email;

    // Esta es la lógica final que llamará a la Cloud Function
    this.teamService.inviteNewUser(email).subscribe({
      next: (response) => {
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