// Extracts a human-readable message from a Clerk API error, rewriting a
// couple of Clerk's stock messages that read as alarming/jargon-y into
// friendlier phrasing for this app's tone.
//
// OLD ACCOUNT HANDLING: The production (live) Clerk instance is a separate
// user store from the dev (test) instance. Accounts created before the
// live-Clerk migration don't exist in production.  Clerk returns
// `form_identifier_not_found` in this case, which we rewrite to a clear
// "create a new account" prompt so the user isn't left confused.
export function getClerkErrorMessage(err: unknown, fallback: string): string {
  const clerkError = err as { errors?: Array<{ code?: string; longMessage?: string; message?: string }> };
  const firstError = clerkError?.errors?.[0];
  const raw = firstError?.longMessage || firstError?.message;

  // Account doesn't exist on this Clerk instance (covers legacy accounts
  // created on the old dev instance before the live-Clerk migration).
  if (firstError?.code === 'form_identifier_not_found') {
    return (
      "No account found with this email address.\n\n" +
      "If you had an account before, please create a new one — " +
      "our system was recently upgraded and existing accounts need to be re-registered."
    );
  }

  // Phone/username not found — same guidance.
  if (firstError?.code === 'form_identifier_exists' || firstError?.code === 'form_identifier_taken') {
    return raw || fallback;
  }

  if (firstError?.code === 'form_password_pwned' || (raw && /data breach/i.test(raw))) {
    return "This password isn't secure enough — it's been found in a data breach. Please try a different one.";
  }

  // Clerk returns form_password_incorrect for a wrong password — raw message
  // is fine but sometimes jargony, so only map if no good raw message.
  if (firstError?.code === 'form_password_incorrect') {
    return raw || 'Incorrect password. Please try again.';
  }

  return raw || fallback;
}
