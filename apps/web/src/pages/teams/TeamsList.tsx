import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Users, Archive, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  listTeams,
  createTeam,
  updateTeam,
  archiveTeam,
  restoreTeam,
} from '../../lib/teams';
import type { Team } from '../../types/team';

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
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || 'Failed to save team';
      toast.error(message);
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
    } catch {
      toast.error('Failed to archive team');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Team Management</h1>
            <p className="text-gray-400">Manage subcontractor teams and assign them to active contracts.</p>
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
            <thead className="border-b border-white/10 bg-navy-dark/30">
              <tr>
                <th className="px-4 py-3 text-gray-300">Team</th>
                <th className="px-4 py-3 text-gray-300">Contact</th>
                <th className="px-4 py-3 text-gray-300">Status</th>
                <th className="px-4 py-3 text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">Loading teams...</td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">No teams found</td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.id} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{team.name}</div>
                      {team.notes && <div className="text-xs text-gray-400 truncate max-w-[280px]">{team.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <div>{team.contactName || '-'}</div>
                      <div className="text-xs text-gray-400">{team.contactEmail || team.contactPhone || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${team.archivedAt ? 'bg-orange-500/20 text-orange-300' : team.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-300'}`}>
                        {team.archivedAt ? 'Archived' : team.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(team)}>
                          Edit
                        </Button>
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

      <Modal
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
      </Modal>
    </div>
  );
};

export default TeamsList;
