import { Component, EventEmitter, Input, Output } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../ui-button/ui-button.component';

@Component({
  selector: 'app-forgot-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent],
  animations: [
    trigger('backdrop', [
      transition(':enter', [style({ opacity: 0 }), animate('300ms ease-out', style({ opacity: 1 }))]),
      transition(':leave', [animate('300ms ease-in', style({ opacity: 0 }))]),
    ]),
    trigger('modal', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
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