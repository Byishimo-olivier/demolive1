/**
 * Extracts a user-friendly error message from caught errors.
 * Sensitive errors (auth, permissions, subscription) get generic messages.
 * All other errors show the actual server message.
 */
export function getErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred'): string {
  if (!error) return fallback;

  // Handle Axios-style errors with response data
  const axiosError = error as {
    response?: {
      status?: number;
      data?: { message?: string };
    };
    message?: string;
  };

  const status = axiosError.response?.status;
  const serverMessage = axiosError.response?.data?.message || axiosError.message;

  // Sensitive errors — don't leak details
  if (status === 401) {
    return 'Your session has expired. Please log in again.';
  }

  // Subscription/plan limit errors (often 402 or specific messages)
  if (
    status === 402 ||
    (serverMessage && /plan|subscription|upgrade|limit|quota/i.test(serverMessage))
  ) {
    return serverMessage || 'This feature is not available on your current plan. Please upgrade.';
  }

  if (status === 403) {
    return "You don't have permission to perform this action.";
  }

  // Permission errors thrown client-side from api wrapper
  if (error instanceof Error && error.message.startsWith('Missing required permission')) {
    return "You don't have permission to perform this action.";
  }

  // Validation errors — show the actual message
  if (status === 400 || status === 422) {
    return serverMessage || fallback;
  }

  // Server errors
  if (status && status >= 500) {
    return serverMessage || 'A server error occurred. Please try again later.';
  }

  // Any other error with a message — show it
  if (serverMessage) {
    return serverMessage;
  }

  return fallback;
}