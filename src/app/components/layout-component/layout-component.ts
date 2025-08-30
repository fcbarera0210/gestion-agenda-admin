import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd, Router } from '@angular/router';
import { ToastContainerComponent } from '../toast-container-component/toast-container-component';
import { AuthService } from '../../services/auth-service';
import { ThemeService } from '../../services/theme-service';
import { Auth, authState } from '@angular/fire/auth';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  templateUrl: './layout-component.html',
  styleUrls: ['./layout-component.scss']
})
export class LayoutComponent implements OnInit {
  isSidebarOpen = false;
  isSidebarCollapsed = false;
  isMobile = window.innerWidth < 768;
  clientPortalUrl: string | null = null;
  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
    private auth: Auth
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && this.isMobile) {
        this.isSidebarOpen = false;
      }
    });
  }

  ngOnInit(): void {
    authState(this.auth).subscribe((user) => {
      this.clientPortalUrl = user
        ? `https://gestion-agenda-cliente.web.app/agendar/${user.uid}`
        : null;
    });
  }

  logout() {
    this.authService.logout()
      .then(() => this.router.navigate(['/login']))
      .catch(error => console.error(error));
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleCollapse() {
    if (!this.isMobile) {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
    }
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.isSidebarOpen = false;
    } else {
      this.isSidebarCollapsed = false;
    }
  }
}