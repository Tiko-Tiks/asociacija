/**
 * Projects Module v19.0 — Canonical Types
 *
 * Governance-aligned, metadata-only, read-only.
 * Schema: v19.0 (CODE FREEZE)
 *
 * NON-NEGOTIABLE:
 * - No project_id
 * - No projects table
 * - No CRUD semantics
 * - Project exists ONLY as APPROVED resolution execution state
 */

/**
 * Allowed operational phases for a project.
 * These are NOT legal states.
 */
export type ProjectPhase =
  | 'planned'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

/**
 * Project-related metadata stored inside:
 * resolutions.metadata
 *
 * Allowed namespaces ONLY:
 * - project.*
 * - indicator.*
 */
export interface ProjectMetadata {
  project: {
    /**
     * Optional external or programmatic project code
     * (e.g. funding program reference).
     */
    code?: string;

    /**
     * Operational execution phase.
     * Does NOT affect resolution status.
     */
    phase: ProjectPhase;

    /**
     * Optional classification tags.
     * Purely operational / informational.
     */
    tags?: string[];

    /**
     * Optional legacy reference for migration traceability.
     * Has NO operational or legal meaning in v19.0.
     */
    legacy_id?: string;
  };

  /**
   * Indicators are derived or tracked values.
   * They are NOT facts.
   */
  indicator?: {
    /**
     * Project progress in range 0..1
     */
    progress?: number;

    /**
     * Planned budget amount (EUR or configured currency).
     */
    budget_planned?: number;

    /**
     * Spent budget amount.
     */
    budget_spent?: number;
  };
}

/**
 * Read-only view model for Projects v19.0.
 *
 * This is a projection of an APPROVED resolution
 * that contains project metadata.
 */
export interface ProjectV19 {
  /**
   * Resolution ID that legally authorizes the project execution.
   */
  resolution_id: string;

  /**
   * Resolution title (human-readable).
   */
  title: string;

  /**
   * Full metadata object (project.* + indicator.*).
   */
  metadata: ProjectMetadata;

  /**
   * Resolution creation timestamp.
   * Used as project origin reference.
   */
  created_at: string;
}

/**
 * Type guard: checks whether a resolution metadata
 * represents a Project v19.0.
 *
 * NOTE: This does NOT validate legality,
 * only structural presence.
 */
export function isProjectV19(
  metadata: unknown
): metadata is ProjectMetadata {
  if (!metadata || typeof metadata !== 'object') return false;

  const m = metadata as any;

  return (
    typeof m.project === 'object' &&
    typeof m.project.phase === 'string'
  );
}
