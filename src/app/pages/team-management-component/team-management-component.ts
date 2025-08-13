import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ToastService } from '../../services/toast-service';
import { Invitation, InvitationService } from '../../services/invitation-service';
import { TeamMember, TeamService } from '../../services/team-service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, DatePipe], // Ya no se necesita el módulo de formularios aquí
  templateUrl: './team-management-component.html',
})
export class TeamManagementComponent implements OnInit {
  isLoading = false;
  generatedCode: string | null = null;
  teamMembers$: Observable<TeamMember[]>;
  pendingInvitations$: Observable<Invitation[]>; 

  constructor(
    private toastService: ToastService,
    private invitationService: InvitationService,
    private teamService: TeamService
  ) {
    this.teamMembers$ = this.teamService.getTeamMembers();
    this.pendingInvitations$ = this.invitationService.getPendingInvitations();
  }

  ngOnInit(): void {}

  async generateCode(): Promise<void> {
    this.isLoading = true;
    this.generatedCode = null;

    try {
      const code = await this.invitationService.createInvitationCode();
      this.generatedCode = code;
      this.toastService.show('Código de invitación generado con éxito', 'success');
    } catch (error) {
      console.error(error);
      this.toastService.show('Error al generar el código', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  copyToClipboard(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.toastService.show('¡Código copiado!', 'success');
    }).catch(err => {
      this.toastService.show('Error al copiar el código', 'error');
      console.error('Error al copiar:', err);
    });
  }
}