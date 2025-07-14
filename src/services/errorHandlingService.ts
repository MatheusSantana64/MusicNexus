// src/services/errorHandlingService.ts
import { Alert } from 'react-native';

export type ErrorSeverity = 'low' | 'medium' | 'high';
export type ErrorCategory = 'network' | 'validation' | 'permission' | 'unknown';

export interface AppError {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  originalError?: Error;
  context?: string;
  recoverable: boolean;
  userMessage: string;
}

export class ErrorHandlingService {
  private static errorHistory: AppError[] = [];
  private static readonly MAX_HISTORY = 50;

  // Create standardized error objects
  static createError(
    message: string,
    category: ErrorCategory = 'unknown',
    severity: ErrorSeverity = 'medium',
    originalError?: Error,
    context?: string
  ): AppError {
    const userMessages = {
      network: 'Verifique sua conexão com a internet e tente novamente.',
      validation: 'Dados inválidos fornecidos. Verifique as informações.',
      permission: 'Você não tem permissão para realizar esta ação.',
      unknown: 'Ocorreu um erro inesperado. Tente novamente.',
    };

    const error: AppError = {
      message,
      category,
      severity,
      originalError,
      context,
      recoverable: severity !== 'high',
      userMessage: userMessages[category],
    };

    this.logError(error);
    return error;
  }

  // Handle different types of errors with appropriate user feedback
  static handleError(error: AppError, showAlert: boolean = true): void {
    if (showAlert) {
      this.showErrorAlert(error);
    }

    // Log to console for debugging
    console.error(`[${error.severity.toUpperCase()}] ${error.category}:`, error.message);
    if (error.originalError) {
      console.error('Original error:', error.originalError);
    }
    if (error.context) {
      console.error('Context:', error.context);
    }
  }

  // Show user-friendly error alerts with recovery options
  private static showErrorAlert(error: AppError): void {
    const title = this.getErrorTitle(error.severity);
    
    const buttons = [
      { text: 'OK', style: 'cancel' as const },
    ];

    // Add retry option for recoverable errors
    if (error.recoverable && error.context) {
      buttons.unshift({
        text: 'Tentar Novamente',
        style: 'default' as const,
        onPress: () => this.retryOperation(error.context!),
      });
    }

    Alert.alert(title, error.userMessage, buttons);
  }

  private static getErrorTitle(severity: ErrorSeverity): string {
    const titles = {
      low: 'Aviso',
      medium: 'Erro',
      high: 'Erro Crítico',
    };
    return titles[severity];
  }

  private static retryOperation(context: string): void {
    // This could trigger a global event or callback for retry
    console.log(`Retrying operation: ${context}`);
    // Implementation would depend on your specific needs
  }

  private static logError(error: AppError): void {
    this.errorHistory.unshift(error);
    
    // Keep only the most recent errors
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_HISTORY);
    }
  }

  // Utility methods for common error types
  static handleNetworkError(originalError: Error, context?: string): AppError {
    return this.createError(
      'Network request failed',
      'network',
      'medium',
      originalError,
      context
    );
  }

  static handleValidationError(message: string, context?: string): AppError {
    return this.createError(
      message,
      'validation',
      'low',
      undefined,
      context
    );
  }

  static handleUnknownError(originalError: unknown, context?: string): AppError {
    const error = originalError instanceof Error ? originalError : new Error('Unknown error');
    return this.createError(
      error.message,
      'unknown',
      'medium',
      error,
      context
    );
  }

  // Get error statistics for debugging
  static getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: this.errorHistory.slice(0, 5),
    };

    this.errorHistory.forEach(error => {
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  // Clear error history
  static clearHistory(): void {
    this.errorHistory = [];
  }
}