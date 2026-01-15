'use client';

import { useMemo, useState } from 'react';
import type { ProjectV19, ProjectPhase } from '@/types/projects_v19';

type SortKey = 'created_at' | 'progress';

export default function ProjectsRegistryClientV19({
  projects,
}: {
  projects: ProjectV19[];
}) {
  const [phase, setPhase] = useState<ProjectPhase | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('created_at');

  const filtered = useMemo(() => {
    let list = [...projects];

    if (phase !== 'all') {
      list = list.filter(
        (p) => p.metadata.project.phase === phase
      );
    }

    if (sortBy === 'progress') {
      list.sort((a, b) => {
        const pa = a.metadata.indicator?.progress ?? 0;
        const pb = b.metadata.indicator?.progress ?? 0;
        return pb - pa;
      });
    } else {
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [projects, phase, sortBy]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 text-sm">
        <select value={phase} onChange={(e) => setPhase(e.target.value as any)}>
          <option value="all">All phases</option>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="created_at">Newest first</option>
          <option value="progress">Progress</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No projects matching filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.resolution_id} className="rounded border p-3">
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-muted-foreground">
                phase: {p.metadata.project.phase}
                {typeof p.metadata.indicator?.progress === 'number'
                  ? ` • progress: ${(p.metadata.indicator.progress * 100).toFixed(0)}%`
                  : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
