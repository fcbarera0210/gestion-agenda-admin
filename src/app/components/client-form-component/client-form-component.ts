import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Client } from '../../services/clients-service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-form-component.html',
})
export class ClientFormComponent implements OnInit {
  @Input() client?: Client;
  @Output() onSave = new EventEmitter<Client>();
  @Output() onCancel = new EventEmitter<void>();

  clientForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.clientForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    if (this.client) {
      this.clientForm.patchValue(this.client);
    }
  }

  save(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }
    const formData = { ...this.client, ...this.clientForm.value };
    this.onSave.emit(formData);
  }

  cancel(): void {
    this.onCancel.emit();
  }
}

