import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-reauth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reauth-modal-component.html',
})
export class ReauthModalComponent {
  @Output() onConfirm = new EventEmitter<string>();
  @Output() onCancel = new EventEmitter<void>();

  reauthForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.reauthForm = this.fb.group({
      password: ['', Validators.required],
    });
  }

  confirm(): void {
    this.onConfirm.emit(this.reauthForm.value.password);
  }

  cancel(): void {
    this.onCancel.emit();
  }
}