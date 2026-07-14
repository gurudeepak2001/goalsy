// Extracts a human-readable message from a Clerk API error, rewriting a
// couple of Clerk's stock messages that read as alarming/jargon-y into
// friendlier phrasing for this app's tone.
export function getClerkErrorMessage(err: unknown, fallback: string): string {
  const clerkError = err as { errors?: Array<{ code?: string; longMessage?: string; message?: string }> };
  const firstError = clerkError?.errors?.[0];
  const raw = firstError?.longMessage || firstError?.message;

  if (firstError?.code === 'form_password_pwned' || (raw && /data breach/i.test(raw))) {
    return "This password isn't secure enough — it's been found in a data breach. Please try a different one.";
  }

  return raw || fallback;
}
