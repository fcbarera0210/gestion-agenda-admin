import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { addMinutes, parseISO } from 'date-fns';
import { TimeBlock } from '../../services/time-block-service';
import { ConfirmationDialogComponent } from '../confirmation-dialog-component/confirmation-dialog-component';

@Component({
  selector: 'app-time-block-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmationDialogComponent],
  templateUrl: './time-block-form-component.html',
})
export class TimeBlockFormComponent implements OnInit {
  @Input() startDate!: Date;
  @Input() timeBlock: TimeBlock | null = null; // Puede recibir un bloqueo para editar
  @Input() isDeleting = false;
  @Output() onSave = new EventEmitter<TimeBlock>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onDelete = new EventEmitter<string>(); // Nuevo evento para eliminar

  blockForm: FormGroup;
  isLoading = false;
  isEditMode = false;
  showConfirmationDialog = false;

  constructor(private fb: FormBuilder) {
    this.blockForm = this.fb.group({
      title: ['Horario Bloqueado', Validators.required],
      start: ['', Validators.required],
      end: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Rellena el formulario con la hora de inicio seleccionada
    // y una hora de fin por defecto (ej. 30 minutos después)
    const endDate = addMinutes(this.startDate, 30);
    this.blockForm.patchValue({
      start: formatDate(this.startDate, 'yyyy-MM-ddTHH:mm', 'en-US'),
      end: formatDate(endDate, 'yyyy-MM-ddTHH:mm', 'en-US'),
    });
  }

   ngOnChanges(changes: SimpleChanges): void {
    this.configureFormForMode();
  }

  private configureFormForMode(): void {
    if (this.timeBlock) {
      // --- MODO EDICIÓN ---
      this.isEditMode = true;
      this.blockForm.patchValue({
        title: this.timeBlock.title,
        start: formatDate(this.timeBlock.start.toDate(), 'yyyy-MM-ddTHH:mm', 'en-US'),
        end: formatDate(this.timeBlock.end.toDate(), 'yyyy-MM-ddTHH:mm', 'en-US'),
      });
    } else {
      // --- MODO CREACIÓN ---
      this.isEditMode = false;
      this.blockForm.reset();
      const endDate = addMinutes(this.startDate, 30);
      this.blockForm.patchValue({
        title: 'Horario Bloqueado',
        start: formatDate(this.startDate, 'yyyy-MM-ddTHH:mm', 'en-US'),
        end: formatDate(endDate, 'yyyy-MM-ddTHH:mm', 'en-US'),
      });
    }
  }

  save(): void {
    if (this.blockForm.invalid) return;
    this.isLoading = true;
    const formValue = this.blockForm.value;
    const startDate = parseISO(formValue.start);
    const endDate = parseISO(formValue.end);

    const blockData: any = {
      title: formValue.title,
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      color: { primary: '#6c757d', secondary: '#e9ecef' },
    };

    if (this.isEditMode) {
      blockData.id = this.timeBlock?.id;
    }

    this.onSave.emit(blockData as TimeBlock);
  }

  // --- Lógica de Eliminación ---
  requestDelete(): void {
    this.showConfirmationDialog = true;
  }

  confirmDelete(): void {
    if (this.timeBlock?.id) {
      this.onDelete.emit(this.timeBlock.id);
    }
    this.showConfirmationDialog = false;
  }

  cancelDelete(): void {
    this.showConfirmationDialog = false;
  }

  cancel(): void {
    this.onCancel.emit();
  }
}