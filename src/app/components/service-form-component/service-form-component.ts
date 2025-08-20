import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Service } from '../../services/services-service';
import { UiButtonComponent } from '../ui-button/ui-button.component';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent],
  templateUrl: './service-form-component.html',
})
export class ServiceFormComponent implements OnInit {
  @Input() service?: Service; // Recibe un servicio existente para editar
  @Output() onSave = new EventEmitter<Service>();
  @Output() onCancel = new EventEmitter<void>();

  serviceForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.serviceForm = this.fb.group({
      name: ['', Validators.required],
      duration: [30, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      bufferTime: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    // Si recibimos un servicio, llenamos el formulario con sus datos
    if (this.service) {
      this.serviceForm.patchValue(this.service);
    }
  }

  save(): void {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }
    const formData = { ...this.service, ...this.serviceForm.value };
    this.onSave.emit(formData);
  }

  cancel(): void {
    this.onCancel.emit();
  }
}

