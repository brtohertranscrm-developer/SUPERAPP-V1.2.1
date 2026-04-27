const parsePerms = (user) => {
  try {
    if (typeof user?.permissions === 'string') {
      const parsed = JSON.parse(user.permissions);
      return Array.isArray(parsed) ? parsed : [];
    }
    return Array.isArray(user?.permissions) ? user.permissions : [];
  } catch {
    return [];
  }
};

export const getAdminLandingPath = (user) => {
  if (!user) return '/login';

  const role = user.role;
  if (role === 'admin' || role === 'superadmin') return '/admin/dashboard';
  if (role !== 'subadmin') return '/dashboard';

  const perms = parsePerms(user);

  if (perms.includes('logistics') && !perms.includes('booking')) return '/admin/staff';
  if (perms.includes('dashboard') && perms.includes('booking')) return '/admin/dashboard';
  if (perms.includes('partners')) return '/admin/partners';
  if (perms.includes('artikel')) return '/admin/artikel';
  if (perms.includes('content')) return '/admin/content';
  if (perms.includes('armada')) return '/admin/armada';
  if (perms.includes('booking')) return '/admin/booking';
  if (perms.includes('logistics')) return '/admin/logistics';
  if (perms.includes('manning')) return '/admin/manning';
  if (perms.includes('pricing')) return '/admin/pricing';
  if (perms.includes('finance')) return '/admin/finance';
  if (perms.includes('users')) return '/admin/users';
  if (perms.includes('settings')) return '/admin/settings';

  return '/admin/staff';
};

export { parsePerms };
