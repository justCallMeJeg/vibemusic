import toast from 'react-hot-toast';

export class ErrorService {
  /**
   * Display a user-friendly error notification
   */
  public notify(error: unknown, fallbackMessage: string = 'An unexpected error occurred'): void {
    console.error('[ErrorService]', error);

    const message = this.extractMessage(error) || fallbackMessage;
    
    toast.error(message, {
      duration: 4000,
      position: 'bottom-right',
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '8px',
      },
    });
  }

  /**
   * Extract a readable message from various error types
   */
  private extractMessage(error: unknown): string | null {
    if (typeof error === 'string') {
      return error; // Rust backend returns stringified errors
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      return (error as any).message;
    }

    return null;
  }
}

export const errorService = new ErrorService();
