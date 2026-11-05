/**
 * Extracts a user-friendly error message from caught errors.
 * Sensitive errors (auth, permissions, subscription) get generic messages.
 * All other errors show the actual server message.
 */
// Backend error code for accounts whose email address is not verified yet
export const EMAIL_NOT_VERIFIED_CODE = 'EMAIL_NOT_VERIFIED';

// 403 codes whose server message tells the user what to do (safe to show)
const EXPLAINED_403_CODES = new Set(['TIMELINE_LOCKED', 'MD_APPROVAL_REQUIRED', 'INVITATION_EMAIL_MISMATCH']);

const errorCode = (error: unknown): string =>
  (error as { response?: { data?: { error?: { details?: { code?: string } } } } })?.response?.data?.error?.details
    ?.code || '';

export function isEmailNotVerifiedError(error: unknown): boolean {
  const data = (error as { response?: { data?: { error?: { details?: { code?: string } } } } })?.response?.data;
  return data?.error?.details?.code === EMAIL_NOT_VERIFIED_CODE;
}

export function getErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred'): string {
  if (!error) return fallback;

  // Not a permissions problem: tell the user to verify their email
  if (isEmailNotVerifiedError(error)) {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
      'Please verify your email address to continue.'
    );
  }

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
    // Signing in with a wrong password is a 401 too: only a request made while signed in
    // means the session ran out
    const sentToken = !!(error as { config?: { headers?: Record<string, unknown> } })?.config?.headers?.Authorization;
    return sentToken ? 'Your session has expired. Please sign in again.' : serverMessage || fallback;
  }

  // Subscription/plan limit errors (often 402 or specific messages)
  if (
    status === 402 ||
    (serverMessage && /plan|subscription|upgrade|limit|quota/i.test(serverMessage))
  ) {
    return serverMessage || 'This feature is not available on your current plan. Please upgrade.';
  }

  if (status === 403) {
    // Business-rule refusals (locked timeline, MD-only approval…) explain themselves
    if (EXPLAINED_403_CODES.has(errorCode(error)) && serverMessage) {
      return serverMessage;
    }
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