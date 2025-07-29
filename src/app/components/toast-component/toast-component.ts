import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastType } from '../../services/toast-service';
import { SafeHtmlPipe } from '../../pipes/safe-html-pipe';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  templateUrl: './toast-component.html',
})
export class ToastComponent implements OnInit {
  @Input() toast!: Toast;
  @Output() onRemove = new EventEmitter<number>();

  ngOnInit(): void {
    // El toast se cierra automáticamente después de 5 segundos
    setTimeout(() => this.remove(), 5000);
  }

  remove() {
    this.onRemove.emit(this.toast.id);
  }

  // Mapeo de tipos de toast a colores de Tailwind y SVG de íconos
  get toastStyles(): { container: string, icon: string, svg: string } {
    const styles = {
      success: { container: 'bg-green-500', icon: 'bg-green-600', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' },
      error:   { container: 'bg-red-500',   icon: 'bg-red-600',   svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>' },
      info:    { container: 'bg-blue-500',  icon: 'bg-blue-600',  svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' }
    };
    return styles[this.toast.type];
  }
}