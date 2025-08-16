import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'theme';
  private currentTheme: 'light' | 'dark' = 'light';

  constructor() {
    const stored = localStorage.getItem(this.storageKey) as 'light' | 'dark' | null;
    if (stored) {
      this.currentTheme = stored;
    }
    this.applyTheme(this.currentTheme);
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(this.currentTheme);
  }

  get theme(): 'light' | 'dark' {
    return this.currentTheme;
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    const html = document.documentElement;
    html.classList.remove('light-theme', 'dark-theme');
    html.classList.add(`${theme}-theme`);
    localStorage.setItem(this.storageKey, theme);
  }
}
