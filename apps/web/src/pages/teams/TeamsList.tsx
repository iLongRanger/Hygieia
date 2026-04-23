import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Users, Archive, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Drawer } from '../../components/ui/Drawer';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { extractApiErrorMessage } from '../../lib/api';
import {
  listTeams,
  createTeam,
  updateTeam,
  archiveTeam,
  restoreTeam,
  resendSubcontractorInvite,
} from '../../lib/teams';
import type { Team } from '../../types/team';

const DEFAULT_CALENDAR_COLOR = '#8b5cf6';

const TeamsList = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
    isActive: 'true',
    calendarColor: '',
  });

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listTeams({
        search: search || undefined,
        includeArchived: showArchived,
        limit: 100,
      });
      setTeams(response.data || []);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [search, showArchived]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const resetForm = () => {
    setFormData({
      name: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      notes: '',
      isActive: 'true',
      calendarColor: '',
    });
    setEditingTeam(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      contactName: team.contactName || '',
      contactEmail: team.contactEmail || '',
      contactPhone: team.contactPhone || '',
      notes: team.notes || '',
      isActive: team.isActive ? 'true' : 'false',
      calendarColor: team.calendarColor || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Team name is required');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formData.name.trim(),
        contactName: formData.contactName.trim() || null,
        contactEmail: formData.contactEmail.trim() || null,
        contactPhone: formData.contactPhone.trim() || null,
        notes: formData.notes.trim() || null,
        isActive: formData.isActive === 'true',
        calendarColor: formData.calendarColor || null,
      };

      if (editingTeam) {
        await updateTeam(editingTeam.id, payload);
        toast.success('Team updated successfully');
      } else {
        await createTeam(payload);
        toast.success('Team created successfully');
      }

      setShowModal(false);
      resetForm();
      await fetchTeams();
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to save team'));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (team: Team) => {
    if (!confirm(`Archive team "${team.name}"?`)) return;

    try {
      await archiveTeam(team.id);
      toast.success('Team archived');
      await fetchTeams();
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to archive team'));
    }
  };

  const handleRestore = async (team: Team) => {
    try {
      await restoreTeam(team.id);
      toast.success('Team restored');
      await fetchTeams();
    } catch {
      toast.error('Failed to restore team');
    }
  };

  const handleResendInvite = async (team: Team) => {
    if (!team.contactEmail) {
      toast.error('Team needs a contact email before sending invite');
      return;
    }

    try {
      const result = await resendSubcontractorInvite(team.id);
      if (result.emailSent) {
        toast.success(`Invite sent to ${result.email}`);
      } else {
        toast.success(`Invite link generated for ${result.email}`);
      }
    } catch {
      toast.error('Failed to resend subcontractor invite');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Team Management</h1>
            <p className="text-surface-500 dark:text-surface-400">Manage subcontractor teams and assign them to active contracts.</p>
          </div>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          New Team
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={showArchived ? 'all' : 'active'}
            options={[
              { value: 'active', label: 'Active only' },
              { value: 'all', label: 'Include archived' },
            ]}
            onChange={(value) => setShowArchived(value === 'all')}
          />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/30">
              <tr>
                <th className="px-4 py-3 text-surface-600 dark:text-surface-400">Team</th>
                <th className="px-4 py-3 text-surface-600 dark:text-surface-400">Contact</th>
                <th className="px-4 py-3 text-surface-600 dark:text-surface-400">Status</th>
                <th className="px-4 py-3 text-surface-600 dark:text-surface-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-surface-500 dark:text-surface-400">Loading teams...</td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-surface-500 dark:text-surface-400">No teams found</td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.id} className="border-b border-surface-200 dark:border-surface-700">
                    <td className="px-4 py-3">
                      <div className="font-medium text-surface-900 dark:text-white">{team.name}</div>
                      {team.notes && <div className="text-xs text-surface-500 dark:text-surface-400 truncate max-w-[280px]">{team.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-surface-600 dark:text-surface-400">
                      <div>{team.contactName || '-'}</div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">{team.contactEmail || team.contactPhone || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${team.archivedAt ? 'bg-orange-500/20 text-orange-300' : team.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-surface-500/20 text-surface-600 dark:text-surface-400'}`}>
                        {team.archivedAt ? 'Archived' : team.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(team)}>
                          Edit
                        </Button>
                        {!team.archivedAt && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleResendInvite(team)}
                            disabled={!team.contactEmail}
                          >
                            Resend Invite
                          </Button>
                        )}
                        {team.archivedAt ? (
                          <Button size="sm" variant="secondary" onClick={() => handleRestore(team)}>
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Restore
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleArchive(team)}>
                            <Archive className="mr-1 h-3 w-3" />
                            Archive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingTeam ? 'Edit Team' : 'Create Team'}
      >
        <div className="space-y-4">
          <Input
            label="Team Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Contact Name"
            value={formData.contactName}
            onChange={(e) => setFormData((prev) => ({ ...prev, contactName: e.target.value }))}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Contact Email"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
            />
            <Input
              label="Contact Phone"
              value={formData.contactPhone}
              onChange={(e) => setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))}
            />
          </div>
          <Select
            label="Status"
            value={formData.isActive}
            onChange={(value) => setFormData((prev) => ({ ...prev, isActive: value }))}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
          />
          <Textarea
            label="Notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <Input
                label="Job Calendar Color"
                type="color"
                value={formData.calendarColor || DEFAULT_CALENDAR_COLOR}
                onChange={(e) => setFormData((prev) => ({ ...prev, calendarColor: e.target.value }))}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFormData((prev) => ({ ...prev, calendarColor: '' }))}
              >
                Use Default
              </Button>
            </div>
            <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
              Jobs assigned to this subcontractor team use this color in the calendar.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editingTeam ? 'Save Changes' : 'Create Team'}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default TeamsList;
