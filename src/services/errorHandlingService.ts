// src/services/errorHandlingService.ts
// Provides centralized error handling functionality for the application.

// Modal action interface for consistency
interface ShowModalFunction {
  (options: {
    title: string;
    message: string;
    actions: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress: () => void;
    }>;
  }): void;
}

export class ErrorHandlingService {
  static showError(
    message: string, 
    title: string = 'Error', 
    showModal?: ShowModalFunction
  ): void {
    if (showModal) {
      showModal({
        title,
        message,
        actions: [
          { text: 'OK', style: 'default', onPress: () => {} }
        ]
      });
    } else {
      // Fallback to console.error if no modal function provided
      console.error(`${title}: ${message}`);
    }
  }

  static handleNetworkError(error: Error, showModal?: ShowModalFunction): void {
    console.error('Network error:', error);
    this.showError(
      'Please check your internet connection and try again.',
      'Network Error',
      showModal
    );
  }

  static handleUnknownError(
    error: unknown, 
    context?: string, 
    showModal?: ShowModalFunction
  ): void {
    console.error('Unknown error:', error, 'Context:', context);
    this.showError(
      'An unexpected error occurred. Please try again.',
      'Error',
      showModal
    );
  }

  // Keep this method for backward compatibility with ErrorBoundary
  static createError(
    message: string, 
    type: string, 
    severity: string, 
    originalError?: Error, 
    context?: string
  ) {
    console.error(`[${severity.toUpperCase()}] ${type}: ${message}`, { originalError, context });
    return new Error(message);
  }

  static handleError(
    error: Error, 
    showAlert: boolean = true, 
    showModal?: ShowModalFunction
  ): void {
    console.error('Handled error:', error);
    if (showAlert) {
      this.showError(error.message, 'Error', showModal);
    }
  }

  // New convenience methods for common error patterns
  static showWarning(
    message: string, 
    title: string = 'Warning', 
    showModal?: ShowModalFunction
  ): void {
    if (showModal) {
      showModal({
        title,
        message,
        actions: [
          { text: 'OK', style: 'cancel', onPress: () => {} }
        ]
      });
    } else {
      console.warn(`${title}: ${message}`);
    }
  }

  static showConfirmation(
    message: string,
    title: string = 'Confirm',
    onConfirm: () => void,
    onCancel?: () => void,
    showModal?: ShowModalFunction
  ): void {
    if (showModal) {
      showModal({
        title,
        message,
        actions: [
          { 
            text: 'Cancel', 
            style: 'cancel', 
            onPress: onCancel || (() => {}) 
          },
          { 
            text: 'Confirm', 
            style: 'default', 
            onPress: onConfirm 
          }
        ]
      });
    } else {
      // Fallback - just execute confirm action
      console.log(`${title}: ${message} - Auto-confirmed`);
      onConfirm();
    }
  }
}