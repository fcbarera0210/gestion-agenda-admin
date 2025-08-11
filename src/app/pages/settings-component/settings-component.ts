import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { SettingsService, WorkSchedule, DaySchedule } from '../../services/settings-service';
import { ToastService } from '../../services/toast-service';
import { Subscription } from 'rxjs';
import { TeamManagementComponent } from '../team-management-component/team-management-component';
import { AuthService } from '../../services/auth-service';
import { ReauthModalComponent } from '../../components/reauth-modal-component/reauth-modal-component';

export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');
  return newPassword && confirmPassword && newPassword.value !== confirmPassword.value ? { passwordsMismatch: true } : null;
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TeamManagementComponent, ReauthModalComponent],
  templateUrl: './settings-component.html',
})
export class SettingsComponent implements OnInit, OnDestroy {
  activeTab: 'profile' | 'schedule' | 'team' | 'account' = 'profile';
  profileForm: FormGroup;
  scheduleForm: FormGroup;
  daysOfWeek = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  private subscriptions: Subscription[] = [];
  isLoading = false;
  passwordForm: FormGroup;
  isLoadingPassword = false;
  showReauthModal = false;

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private toastService: ToastService,
    private authService: AuthService
  ) {
    this.profileForm = this.fb.group({
      displayName: ['', Validators.required],
      title: [''],
      phone: [''],
      address: [''],
    });

    this.scheduleForm = this.fb.group({
      days: this.fb.array(
        this.daysOfWeek.map(() => this.createDayGroup())
      )
    });

    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordsMatchValidator });
  }

  ngOnInit(): void {
    this.settingsService.getProfessionalProfile().subscribe(profile => {
      if (profile) {
        // Rellena el formulario de perfil
        this.profileForm.patchValue(profile);

        // Rellena el formulario de horario
        if (profile.workSchedule) {
          this.patchForm(profile.workSchedule);
        }
      }
      this.setupDaySubscriptions();
    });
  }

  // Crea el FormGroup para un día con la nueva estructura
  private createDayGroup(): FormGroup {
    return this.fb.group({
      isActive: [false],
      workHours: this.fb.group({
        start: ['09:00'],
        end: ['18:00']
      }),
      breaks: this.fb.array([])
    });
  }

  // Rellena el formulario con los datos de Firestore
  private patchForm(schedule: WorkSchedule) {
    this.daysOfWeek.forEach((dayName, index) => {
      const dayData = schedule[dayName.toLowerCase()];
      if (dayData) {
        const dayGroup = this.days.at(index);
        dayGroup.patchValue({ 
          isActive: dayData.isActive,
          workHours: dayData.workHours || { start: '09:00', end: '18:00' }
        });
        
        const breaksArray = dayGroup.get('breaks') as FormArray;
        breaksArray.clear();
        if (dayData.breaks && Array.isArray(dayData.breaks)) {
          dayData.breaks.forEach(breakSlot => {
            breaksArray.push(this.createBreakGroup(breakSlot.start, breakSlot.end));
          });
        }
      }
    });
  }
  
  // Helpers para acceder a los FormArray y FormGroups
  get days(): FormArray {
    return this.scheduleForm.get('days') as FormArray;
  }

  getBreaks(dayIndex: number): FormArray {
    return this.days.at(dayIndex).get('breaks') as FormArray;
  }

  // Crea el FormGroup para un descanso
  private createBreakGroup(start = '13:00', end = '14:00'): FormGroup {
    return this.fb.group({
      start: [start],
      end: [end]
    });
  }

  // Añade un descanso a un día
  addBreak(dayIndex: number) {
    this.getBreaks(dayIndex).push(this.createBreakGroup());
  }

  // Elimina un descanso de un día
  removeBreak(dayIndex: number, breakIndex: number) {
    this.getBreaks(dayIndex).removeAt(breakIndex);
  }

  saveSchedule() {
    this.isLoading = true;
    const formValue = this.scheduleForm.getRawValue(); // Usamos getRawValue para incluir los campos deshabilitados
    const scheduleToSave: WorkSchedule = {};
    
    this.daysOfWeek.forEach((dayName, index) => {
      scheduleToSave[dayName.toLowerCase()] = formValue.days[index];
    });

    this.settingsService.updateWorkSchedule(scheduleToSave)
      .then(() => this.toastService.show('Horario guardado con éxito', 'success'))
      .catch(err => this.toastService.show('Error al guardar el horario', 'error'))
      .finally(() => this.isLoading = false);
  }
  
  // Lógica para habilitar/deshabilitar campos (sin cambios importantes)
  private setupDaySubscriptions() {
    this.days.controls.forEach((dayControl, index) => {
      const sub = dayControl.get('isActive')?.valueChanges.subscribe(isActive => {
        const workHoursGroup = dayControl.get('workHours');
        const breaksArray = dayControl.get('breaks');
        if (isActive) {
          workHoursGroup?.enable();
          breaksArray?.enable();
        } else {
          workHoursGroup?.disable();
          breaksArray?.disable();
        }
      });
      this.subscriptions.push(sub!);
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  selectTab(tab: 'profile' | 'schedule' | 'team' | 'account'): void {
    this.activeTab = tab;
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.isLoadingPassword = true;
    const { newPassword } = this.passwordForm.value;

    this.authService.changeUserPassword(newPassword)
      .then(() => {
        this.toastService.show('Contraseña actualizada con éxito', 'success');
        this.passwordForm.reset();
        this.isLoadingPassword = false;
      })
      .catch((error) => {
        // 👇 ESTA ES LA LÓGICA CLAVE
        if (error.code === 'auth/requires-recent-login') {
          // Si el error es el que esperamos, abrimos el modal de re-autenticación
          this.toastService.show('Por favor, confirma tu contraseña actual.', 'info');
          this.showReauthModal = true;
        } else {
          this.toastService.show('Error: ' + error.message, 'error');
        }
        this.isLoadingPassword = false;
        console.error(error);
      });
  }

  handleReauthentication(currentPassword: string) {
    this.showReauthModal = false; // Cierra el modal de re-autenticación
    this.isLoadingPassword = true; // Muestra el loading en el botón original

    const { newPassword } = this.passwordForm.value;
    
    this.authService.reauthenticateAndChangePassword(currentPassword, newPassword)
      .then(() => {
        this.toastService.show('Contraseña actualizada con éxito', 'success');
        this.passwordForm.reset();
      })
      .catch(err => {
        this.toastService.show('Error de autenticación. Contraseña incorrecta.', 'error');
        console.error(err);
      })
      .finally(() => {
        this.isLoadingPassword = false;
      });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.toastService.show('Por favor, completa los campos requeridos.', 'error');
      return;
    }
    this.isLoading = true;
    this.settingsService.updateProfile(this.profileForm.value)
      .then(() => this.toastService.show('Perfil actualizado con éxito', 'success'))
      .catch(() => this.toastService.show('Error al actualizar el perfil', 'error'))
      .finally(() => this.isLoading = false);
  }
}