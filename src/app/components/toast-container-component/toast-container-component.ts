import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Toast, ToastService } from '../../services/toast-service';
import { ToastComponent } from '../toast-component/toast-component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  templateUrl: './toast-container-component.html',
})
export class ToastContainerComponent {
  toasts$: Observable<Toast[]>;

  constructor(private toastService: ToastService) {
    this.toasts$ = this.toastService.toasts$;
  }

  removeToast(toastId: number) {
    this.toastService.remove(toastId);
  }
}