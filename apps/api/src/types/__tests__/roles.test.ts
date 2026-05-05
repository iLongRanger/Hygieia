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
      expect(resolveHighestRole(['cleaner', 'subcontractor'])).toBe('subcontractor');
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

  describe('finance permissions', () => {
    it('does not grant managers global finance report or payroll access', () => {
      expect(hasPermission('manager', 'finance_reports_read')).toBe(false);
      expect(hasPermission('manager', 'payroll_read')).toBe(false);
    });

    it('does not grant managers team mutation access', () => {
      expect(hasPermission('manager', 'teams_read')).toBe(true);
      expect(hasPermission('manager', 'teams_write')).toBe(false);
    });

    it('keeps field workers limited to their own payroll access', () => {
      expect(hasPermission('cleaner', 'payroll_read')).toBe(true);
      expect(hasPermission('subcontractor', 'payroll_read')).toBe(true);
    });
  });

  describe('appointment permissions', () => {
    it('grants appointment permissions to manager roles only above field workers', () => {
      expect(hasPermission('manager', 'appointments_read')).toBe(true);
      expect(hasPermission('manager', 'appointments_write')).toBe(true);
      expect(hasPermission('cleaner', 'appointments_read')).toBe(false);
      expect(hasPermission('subcontractor', 'appointments_write')).toBe(false);
    });
  });

  describe('isRoleAtLeast', () => {
    it('evaluates role hierarchy correctly', () => {
      expect(isRoleAtLeast('admin', 'manager')).toBe(true);
      expect(isRoleAtLeast('manager', 'admin')).toBe(false);
    });
  });
});
