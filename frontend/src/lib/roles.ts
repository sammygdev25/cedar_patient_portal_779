// The app's roles for its pages, from the plan like backend/api/access.py (generated). Hiding a page is for the
// person using the app; the server checks the role on every request.
export const ROLES: readonly string[] = ["patient", "doctor", "receptionist"];
export const STAFF_ROLES: readonly string[] = ["doctor", "receptionist"];
export const HOME_BY_ROLE: Record<string, string> = {"patient": "/patient", "doctor": "/staff/doctor", "receptionist": "/staff/doctor"};

export function homeFor(role: string | null | undefined): string {
  return (role && HOME_BY_ROLE[role]) || '/';
}

// Where a signed-in user lands: their role's own area. Takes the user or the sign-in answer that holds it.
export function homeForUser(value: unknown): string {
  const holder = value && typeof value === 'object' && 'user' in value ? (value as { user?: unknown }).user : value;
  const role = holder && typeof holder === 'object' ? (holder as { role?: unknown }).role : undefined;
  return homeFor(typeof role === 'string' ? role : null);
}
