// Permissive stub for CrudCommandParsers
// During merge this file was deleted in one side. To avoid losing functionality
// we restore a conservative placeholder implementation. Replace with the
// project's original implementation or merge specific parsing logic later.

export type CrudCommand = {
  entity: string;
  action: string;
  payload?: Record<string, any>;
};

/**
 * Parse a free-form command into a CrudCommand structure.
 * This is a permissive parser that tries to extract an entity and action.
 * Improve later with actual parsing rules.
 */
export function parseCrudCommand(text: string): CrudCommand | null {
  if (!text || typeof text !== 'string') return null;
  const normalized = text.trim().toLowerCase();

  // Very naive heuristics: "create account", "delete loan", "update transaction"
  const parts = normalized.split(/\s+/);
  if (parts.length < 2) return null;

  const action = parts[0];
  const entity = parts[1];

  return { entity, action };
}

export default {
  parseCrudCommand,
};
