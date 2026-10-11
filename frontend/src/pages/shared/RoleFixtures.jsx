import React, { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { matchesApi, teamsApi } from '../../services/api/apiServices';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import Table from '../../components/common/Table';
import ErrorState from '../../components/common/ErrorState';

export default function RoleFixtures() {
  const { currentUser } = useAuth();
  const fetchFixtures = useCallback(async () => {
    const matches = await matchesApi.getMatches();
    if (currentUser.role === 'Score Updater') return matches;
    const teams = await teamsApi.getTeams();
    const teamIds = new Set(teams.map(team => Number(team.team_id || team.id)));
    return matches.filter(match => teamIds.has(Number(match.team_a_id)) || teamIds.has(Number(match.team_b_id)));
  }, [currentUser.role]);
  const { data: fixtures, loading, error, refetch } = useAutoRefresh(fetchFixtures, { interval: 15000, deps: [currentUser.id, currentUser.role] });
  return <div className="nec-portal-page">
    <h2 className="nec-page-title">Matches</h2>
    {error ? <ErrorState onRetry={refetch} /> : <Table loading={loading} data={fixtures || []} columns={[
      { key: 'sport', label: 'Sport' },
      { key: 'teamA', label: 'Team A' },
      { key: 'teamB', label: 'Team B' },
      { key: 'scheduled_time', label: 'Scheduled', render: date => new Date(date).toLocaleString('en-IN') },
      { key: 'status', label: 'Status' },
      { key: 'venue', label: 'Venue' }
    ]} />}
  </div>;
}
