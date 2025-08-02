import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SettingsService, WorkSchedule, DaySchedule } from '../../services/settings-service';
import { ToastService } from '../../services/toast-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-component.html',
})
export class SettingsComponent implements OnInit, OnDestroy {
  scheduleForm: FormGroup;
  daysOfWeek = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  private subscriptions: Subscription[] = [];
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private toastService: ToastService
  ) {
    this.scheduleForm = this.fb.group({
      days: this.fb.array(
        this.daysOfWeek.map(() => this.createDayGroup())
      )
    });
  }

  ngOnInit(): void {
    this.settingsService.getProfessionalProfile().subscribe(profile => {
      if (profile && profile.workSchedule) {
        this.patchForm(profile.workSchedule);
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
}