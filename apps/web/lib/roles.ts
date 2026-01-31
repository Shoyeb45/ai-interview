import type { RoleCode } from "@/types/schema";

/** Normalize for comparison: uppercase, no underscores (e.g. "hiring_manager" -> "HIRINGMANAGER") */
function normalizeRole(value: string): string {
  return value.toUpperCase().replace(/_/g, "");
}

/**
 * /auth/me can return roles as either string[] (e.g. ["USER"], ["hiring_manager"]) or
 * { code: RoleCode }[]. This helper works with both shapes and is case-insensitive.
 */
export function hasRoleInRoles(
  roles: unknown[] | undefined,
  code: RoleCode
): boolean {
  if (!roles?.length) return false;
  const normalizedCode = normalizeRole(code);
  return roles.some((r) => {
    if (typeof r === "string") return normalizeRole(r) === normalizedCode;
    if (r && typeof r === "object" && "code" in r) {
      return normalizeRole((r as { code: string }).code) === normalizedCode;
    }
    return false;
  });
}
