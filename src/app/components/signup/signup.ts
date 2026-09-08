import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  templateUrl: './signup.html',
  imports: [ReactiveFormsModule, MatIconModule],
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePasswordVisibility() {
    this.showPassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update((value) => !value);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const password = this.form.controls.password.value ?? '';
    const confirmPassword = this.form.controls.confirmPassword.value ?? '';

    if (password !== confirmPassword) {
      this.errorMessage.set('As senhas não correspondem.');
      return;
    }

    const name = this.form.controls.name.value ?? '';
    const email = this.form.controls.email.value ?? '';

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.userService.save({ name, email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set(
          'Cadastro realizado com sucesso! Redirecionando para login...',
        );
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.loading.set(false);
        if (error?.status === 409 || error?.status === 400) {
          this.errorMessage.set(
            'Email já cadastrado ou dados inválidos. Tente outro email.',
          );
          return;
        }
        this.errorMessage.set(
          'Não foi possível cadastrar agora. Tente novamente.',
        );
      },
    });
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
