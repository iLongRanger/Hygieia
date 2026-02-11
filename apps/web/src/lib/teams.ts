import api from './api';
import type { Team, ListTeamsParams, CreateTeamInput, UpdateTeamInput } from '../types/team';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listTeams(params?: ListTeamsParams): Promise<PaginatedResponse<Team>> {
  const response = await api.get('/teams', { params });
  return response.data;
}

export async function getTeam(id: string): Promise<Team> {
  const response = await api.get(`/teams/${id}`);
  return response.data.data;
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const response = await api.post('/teams', input);
  return response.data.data;
}

export async function updateTeam(id: string, input: UpdateTeamInput): Promise<Team> {
  const response = await api.patch(`/teams/${id}`, input);
  return response.data.data;
}

export async function archiveTeam(id: string): Promise<Team> {
  const response = await api.delete(`/teams/${id}`);
  return response.data.data;
}

export async function restoreTeam(id: string): Promise<Team> {
  const response = await api.post(`/teams/${id}/restore`);
  return response.data.data;
}
