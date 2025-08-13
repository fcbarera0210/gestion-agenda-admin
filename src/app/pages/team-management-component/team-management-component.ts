import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ToastService } from '../../services/toast-service';
import { Invitation, InvitationService } from '../../services/invitation-service';
import { TeamMember, TeamService } from '../../services/team-service';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog-component/confirmation-dialog-component';
import { TeamMemberEditModalComponent } from '../../components/team-member-edit-modal-component/team-member-edit-modal-component';

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, DatePipe, TeamMemberEditModalComponent, ConfirmationDialogComponent], // Ya no se necesita el módulo de formularios aquí
  templateUrl: './team-management-component.html',
})
export class TeamManagementComponent implements OnInit {
  isLoading = false;
  generatedCode: string | null = null;
  teamMembers$: Observable<TeamMember[]>;
  pendingInvitations$: Observable<Invitation[]>; 
  showEditModal = false;
  showDeleteDialog = false;
  memberToEdit: TeamMember | null = null;
  memberToDelete: TeamMember | null = null;
  isLoadingEdit = false;
  isLoadingDelete = false;

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

  openEditModal(member: TeamMember): void {
    this.memberToEdit = member;
    this.showEditModal = true;
  }

  openDeleteDialog(member: TeamMember): void {
    this.memberToDelete = member;
    this.showDeleteDialog = true;
  }

  closeModals(): void {
    this.showEditModal = false;
    this.showDeleteDialog = false;
    this.memberToEdit = null;
    this.memberToDelete = null;
  }

  handleUpdateRole(event: { memberId: string, newRole: 'admin' | 'member' }): void {
    this.isLoadingEdit = true;
    this.teamService.updateMemberRole(event.memberId, event.newRole)
      .then(() => this.toastService.show('Rol actualizado con éxito', 'success'))
      .catch(() => this.toastService.show('Error al actualizar el rol', 'error'))
      .finally(() => {
        this.isLoadingEdit = false; // 👈 Finaliza la carga
        this.closeModals();
      });
  }

  handleDeleteMember(): void {
    if (!this.memberToDelete?.id) return;
    this.isLoadingDelete = true;
    this.teamService.deleteTeamMember(this.memberToDelete.id)
      .then(() => this.toastService.show('Miembro eliminado con éxito', 'success'))
      .catch(() => this.toastService.show('Error al eliminar al miembro', 'error'))
      .finally(() => {
        this.isLoadingDelete = false; // 👈 Finaliza la carga
        this.closeModals();
      });
  }
}