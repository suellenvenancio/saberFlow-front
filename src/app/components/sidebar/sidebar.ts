import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthenticationService } from '../../services/authentication.service';
import { ThemeService } from '../../services/theme.service';
import { UserService } from '../../services/user.service';

interface NavItem {
  label: string;
  icon: string;
  route: string | null;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
  standalone: true,
  imports: [MatIconModule, RouterLink, RouterLinkActive],
})
export class SidebarComponent {
  private authenticationService = inject(AuthenticationService);
  private userService = inject(UserService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  themeService = inject(ThemeService);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'home', route: '/dashboard' },
    { label: 'Flashcards', icon: 'style', route: '/cards' },
    { label: 'Questões', icon: 'help', route: '/questions' },
    { label: 'Categorias', icon: 'folder', route: null },
    { label: 'Progresso', icon: 'bar_chart', route: null },
    { label: 'Estatísticas', icon: 'pie_chart', route: null },
    { label: 'Configurações', icon: 'settings', route: '/settings' },
  ];

  userName = signal<string | null>(null);
  userInitial = computed(() => this.userName()?.charAt(0).toUpperCase() ?? '?');
  isUserMenuOpen = signal(false);

  ngOnInit(): void {
    const userId = this.authenticationService.getUserId();
    if (!userId) return;

    this.userService.findById(userId).subscribe({
      next: (user) => this.userName.set(user.name),
      error: () => this.userName.set(null),
    });
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((isOpen) => !isOpen);
  }

  logout(): void {
    this.authenticationService.logout();
    this.isUserMenuOpen.set(false);
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isUserMenuOpen.set(false);
    }
  }
}
