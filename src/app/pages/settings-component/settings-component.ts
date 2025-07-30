import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SettingsService, WorkSchedule } from '../../services/settings-service';
import { ToastService } from '../../services/toast-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-component.html',
})
export class SettingsComponent implements OnInit {
  scheduleForm: FormGroup;
  daysOfWeek = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  private subscriptions: Subscription[] = [];
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private toastService: ToastService
  ) {
    // Inicializamos el formulario con una estructura vacía
    this.scheduleForm = this.fb.group({
      days: this.fb.array(
        this.daysOfWeek.map(() => this.createDayGroup())
      )
    });
  }

  ngOnInit(): void {
    // Cargamos los datos del profesional y actualizamos el formulario
    this.settingsService.getProfessionalProfile().subscribe(profile => {
      if (profile && profile.workSchedule) {
        this.patchForm(profile.workSchedule);
      }
      this.setupDaySubscriptions();
    });
  }

  // Helper para obtener el FormArray de días
  get days(): FormArray {
    return this.scheduleForm.get('days') as FormArray;
  }

  // Devuelve los slots de un día específico
  getSlots(dayIndex: number): FormArray {
    return this.days.at(dayIndex).get('slots') as FormArray;
  }

  // Crea el FormGroup para un día
  private createDayGroup(): FormGroup {
    return this.fb.group({
      isActive: [false],
      slots: this.fb.array([])
    });
  }

  // Crea el FormGroup para un intervalo de tiempo (slot)
  private createSlotGroup(start = '09:00', end = '18:00'): FormGroup {
    return this.fb.group({
      start: [start],
      end: [end]
    });
  }
  
  // Rellena el formulario con los datos guardados en Firestore
  private patchForm(schedule: WorkSchedule) {
    this.daysOfWeek.forEach((dayName, index) => {
      const dayData = schedule[dayName.toLowerCase()];
      if (dayData) {
        const dayGroup = this.days.at(index);
        dayGroup.patchValue({ isActive: dayData.isActive });
        
        const slotsArray = dayGroup.get('slots') as FormArray;
        slotsArray.clear();
        
        // 👇 AÑADIMOS ESTA VERIFICACIÓN
        if (dayData.slots && Array.isArray(dayData.slots)) {
          dayData.slots.forEach(slot => {
            slotsArray.push(this.createSlotGroup(slot.start, slot.end));
          });
        }
        
        if (dayData.isActive) {
          slotsArray.enable();
        } else {
          slotsArray.disable();
        }
      }
    });
  }

  private setupDaySubscriptions() {
    this.days.controls.forEach((dayControl, index) => {
      const sub = dayControl.get('isActive')?.valueChanges.subscribe(isActive => {
        const slotsArray = this.getSlots(index);
        if (isActive) {
          slotsArray.enable();
        } else {
          slotsArray.disable();
        }
      });
      this.subscriptions.push(sub!);
    });
  }

  // Añade un nuevo intervalo de tiempo a un día
  addSlot(dayIndex: number) {
    // Por defecto, añade un descanso de una hora
    this.getSlots(dayIndex).push(this.createSlotGroup('13:00', '14:00'));
  }

  // Elimina un intervalo de tiempo de un día
  removeSlot(dayIndex: number, slotIndex: number) {
    this.getSlots(dayIndex).removeAt(slotIndex);
  }

  // Guarda todos los cambios en Firestore
  saveSchedule() {
    this.isLoading = true;
    const formValue = this.scheduleForm.value;
    const scheduleToSave: WorkSchedule = {};
    
    this.daysOfWeek.forEach((dayName, index) => {
      const dayControl = formValue.days[index];
      // Si el día no está activo, guardamos los slots como un array vacío
      if (!dayControl.isActive) {
        scheduleToSave[dayName.toLowerCase()] = { isActive: false, slots: [] };
      } else {
        scheduleToSave[dayName.toLowerCase()] = dayControl;
      }
    });

    this.settingsService.updateWorkSchedule(scheduleToSave)
      .then(() => {
        this.toastService.show('Horario guardado con éxito', 'success');
      })
      .catch(err => {
        this.toastService.show('Error al guardar el horario', 'error');
        console.error(err);
      })
      .finally(() => {
        this.isLoading = false;
      });;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}