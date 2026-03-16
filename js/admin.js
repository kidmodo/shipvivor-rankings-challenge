export function hasAdminAccess(user) {
  return Boolean(user?.isAdmin);
}
