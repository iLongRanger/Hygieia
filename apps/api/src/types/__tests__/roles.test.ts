import {
  hasPermission,
  isRoleAtLeast,
  resolveHighestRole,
} from '../roles';

describe('roles utilities', () => {
  describe('resolveHighestRole', () => {
    it('returns cleaner when no roles are assigned', () => {
      expect(resolveHighestRole([])).toBe('cleaner');
    });

    it('returns the highest role by hierarchy regardless of input order', () => {
      expect(resolveHighestRole(['manager', 'owner', 'cleaner'])).toBe('owner');
      expect(resolveHighestRole(['cleaner', 'admin'])).toBe('admin');
    });
  });

  describe('hasPermission', () => {
    it('uses wildcard all permission for owner', () => {
      expect(hasPermission('owner', 'nonexistent_permission')).toBe(true);
    });

    it('returns false when permission is not granted', () => {
      expect(hasPermission('manager', 'billing')).toBe(false);
    });
  });

  describe('isRoleAtLeast', () => {
    it('evaluates role hierarchy correctly', () => {
      expect(isRoleAtLeast('admin', 'manager')).toBe(true);
      expect(isRoleAtLeast('manager', 'admin')).toBe(false);
    });
  });
});
