/**
 * SenseiClaw admin API client — reads and switches the model that answers
 * tutoring requests.
 *
 * - getModelCatalog() — GET /admin/models
 * - setActiveModel()  — POST /admin/model
 *
 * Swapping a *local* model that is not already resident makes the backend load
 * weights from disk, which takes 1-5 minutes. The POST therefore gets a very
 * long timeout: aborting early would leave the UI out of sync with a swap that
 * is still going through on the server.
 */

const SENSEI_BASE_URL =
  process.env.EXPO_PUBLIC_SENSEI_API_URL?.trim() || 'http://167.86.98.204:4050';

/** Catalogue read — short, because a dead backend must not hang the screen. */
const CATALOG_TIMEOUT_MS = 12000;
/** Cold model swap — must outlast the worst-case 5 minute load. */
export const MODEL_SWITCH_TIMEOUT_MS = 900000;

export type ModelMode = 'cloud' | 'local';

export interface CloudModelOption {
  id: string;
  label: string;
  note?: string | null;
}

export interface LocalModelOption {
  id: string;
  label: string;
  vision: boolean;
}

export interface ModelCatalog {
  current: { mode: ModelMode; model: string };
  /** The local model already in memory — selecting it costs no load time. */
  residentLocalModel: string | null;
  cloud: CloudModelOption[];
  local: LocalModelOption[];
  localSwapWarning: string | null;
}

export interface SetModelResult {
  ok: boolean;
  mode: ModelMode;
  model: string;
  vision: boolean | null;
  /** Non-null when the chosen model lacks a capability (e.g. no vision). */
  warning: string | null;
}

async function requestJson(
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown> {
  // React Native's fetch has no built-in timeout, so an unreachable host would
  // otherwise hang forever and strand the caller on a spinner.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${SENSEI_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Request timed out — the Sensei backend did not answer.');
    }
    throw new Error(
      error instanceof Error && error.message
        ? error.message
        : 'Network error — check your connection',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Sensei admin request failed (${response.status})`);
  }

  return response.json();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asMode(value: unknown, fallback: ModelMode = 'cloud'): ModelMode {
  return value === 'local' || value === 'cloud' ? value : fallback;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function parseCloud(value: unknown): CloudModelOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => asString(entry.id).length > 0)
    .map((entry) => ({
      id: asString(entry.id),
      label: asString(entry.label) || asString(entry.id),
      note: typeof entry.note === 'string' ? entry.note : null,
    }));
}

function parseLocal(value: unknown): LocalModelOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => asString(entry.id).length > 0)
    .map((entry) => ({
      id: asString(entry.id),
      label: asString(entry.label) || asString(entry.id),
      vision: entry.vision === true,
    }));
}

/**
 * Fetch the model catalogue. Throws when the backend is unreachable so callers
 * can render a disabled state instead of an endless spinner.
 */
export async function getModelCatalog(): Promise<ModelCatalog> {
  const data = asRecord(await requestJson('/admin/models', { method: 'GET' }, CATALOG_TIMEOUT_MS));
  const current = asRecord(data.current);

  return {
    current: {
      mode: asMode(current.mode),
      model: asString(current.model),
    },
    residentLocalModel: asString(data.resident_local_model) || null,
    cloud: parseCloud(data.cloud),
    local: parseLocal(data.local),
    localSwapWarning:
      typeof data.local_swap_warning === 'string' ? data.local_swap_warning : null,
  };
}

/**
 * Switch the active model. A cold local swap can hold this promise open for
 * several minutes — show a blocking "switching" state while it is in flight.
 */
export async function setActiveModel(
  mode: ModelMode,
  model: string,
): Promise<SetModelResult> {
  const data = asRecord(
    await requestJson(
      '/admin/model',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, model }),
      },
      MODEL_SWITCH_TIMEOUT_MS,
    ),
  );

  return {
    ok: data.ok !== false,
    mode: asMode(data.mode, mode),
    model: asString(data.model) || model,
    vision: typeof data.vision === 'boolean' ? data.vision : null,
    warning: typeof data.warning === 'string' && data.warning ? data.warning : null,
  };
}
