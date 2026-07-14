/**
 * Shared helpers for deriving display data (initials) from the signed-in Clerk user's name.
 * Keeping this in one place ensures every screen's avatar renders the same real initials
 * instead of each screen hardcoding its own placeholder.
 */
export function getInitials(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return 'U';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
