import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../ui-button/ui-button.component';

@Component({
  selector: 'app-forgot-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent],
  templateUrl: './forgot-password-modal-component.html',
})
export class ForgotPasswordModalComponent {
  @Input() isLoading = false;
  @Output() onSend = new EventEmitter<string>();
  @Output() onCancel = new EventEmitter<void>();

  forgotPasswordForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  send(): void {
    if (this.forgotPasswordForm.invalid) return;
    this.onSend.emit(this.forgotPasswordForm.value.email);
  }

  cancel(): void {
    this.onCancel.emit();
  }
}