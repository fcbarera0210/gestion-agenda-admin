import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-button.component.html',
  styleUrls: ['./ui-button.component.scss']
})
export class UiButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input('class') classNames = '';
  @Output('click') onClick = new EventEmitter<Event>();

  handleClick(event: Event) {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
    this.onClick.emit(event);
  }
}
