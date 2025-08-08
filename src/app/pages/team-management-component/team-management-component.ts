import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast-service';
import { InvitationService } from '../../services/invitation-service'; // 👈 Importa el nuevo servicio

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule], // Ya no necesitamos ReactiveFormsModule aquí
  templateUrl: './team-management-component.html',
})
export class TeamManagementComponent implements OnInit {
  isLoading = false;
  generatedCode: string | null = null;

  constructor(
    private toastService: ToastService,
    private invitationService: InvitationService // 👈 Inyecta el servicio
  ) {}

  ngOnInit(): void {}

  async generateCode(): Promise<void> {
    this.isLoading = true;
    this.generatedCode = null; // Limpiamos el código anterior

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
}