import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  private nextId = 0;

  show(message: string, type: ToastType = 'info') {
    const newToast: Toast = { id: this.nextId++, message, type };
    const currentToasts = this.toastsSubject.getValue();
    this.toastsSubject.next([...currentToasts, newToast]);
  }

  remove(toastId: number) {
    const updatedToasts = this.toastsSubject.getValue().filter(toast => toast.id !== toastId);
    this.toastsSubject.next(updatedToasts);
  }
}