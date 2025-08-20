import { Component, EventEmitter, Output } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-reauth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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