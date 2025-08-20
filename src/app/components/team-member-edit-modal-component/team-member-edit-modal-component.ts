import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TeamMember } from '../../services/team-service';
import { UiButtonComponent } from '../ui-button/ui-button.component';

@Component({
  selector: 'app-team-member-edit-modal',
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
  templateUrl: './team-member-edit-modal-component.html',
})
export class TeamMemberEditModalComponent implements OnInit {
  @Input() member!: TeamMember;
  @Input() isLoading = false;
  @Output() onSave = new EventEmitter<{ memberId: string, newRole: 'admin' | 'member' }>();
  @Output() onCancel = new EventEmitter<void>();

  editForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.editForm = this.fb.group({
      role: ['member'],
    });
  }

  ngOnInit(): void {
    if (this.member) {
      this.editForm.patchValue({ role: this.member.role });
    }
  }

  save(): void {
    this.onSave.emit({
      memberId: this.member.id!,
      newRole: this.editForm.value.role,
    });
  }

  cancel(): void {
    this.onCancel.emit();
  }
}