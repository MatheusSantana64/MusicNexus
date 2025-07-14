// src/services/errorHandlingService.ts
// Provides centralized error handling functionality for the application.
import { Alert } from 'react-native';

export class ErrorHandlingService {
  static showError(message: string, title: string = 'Erro'): void {
    Alert.alert(title, message);
  }

  static handleNetworkError(error: Error): void {
    console.error('Network error:', error);
    this.showError('Verifique sua conexão com a internet e tente novamente.');
  }

  static handleUnknownError(error: unknown, context?: string): void {
    console.error('Unknown error:', error, 'Context:', context);
    this.showError('Ocorreu um erro inesperado. Tente novamente.');
  }

  // Keep this method for backward compatibility with ErrorBoundary
  static createError(message: string, type: string, severity: string, originalError?: Error, context?: string) {
    console.error(`[${severity.toUpperCase()}] ${type}: ${message}`, { originalError, context });
    return new Error(message);
  }

  static handleError(error: Error, showAlert: boolean = true): void {
    console.error('Handled error:', error);
    if (showAlert) {
      this.showError(error.message);
    }
  }
}