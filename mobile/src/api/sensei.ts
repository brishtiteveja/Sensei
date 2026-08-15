/** Thin wrappers over the FastAPI endpoints in backend/sensei/server.py. */

import { HEALTH_TIMEOUT_MS, request } from './http';
import type { CoursePath, Diagnosis, Health, LearnerProfile } from './types';

export function getHealth(baseUrl: string): Promise<Health> {
  // Health must fail fast: it is the "is the box there?" probe, and a 15-minute
  // hang would make an unreachable box indistinguishable from a warming one.
  return request<Health>({ baseUrl, path: '/health', timeoutMs: HEALTH_TIMEOUT_MS });
}

export function getCoursePath(baseUrl: string, learnerId: string): Promise<CoursePath> {
  return request<CoursePath>({
    baseUrl,
    path: `/curriculum/path?learner_id=${encodeURIComponent(learnerId)}`,
    timeoutMs: 30_000,
  });
}

export function getLearner(baseUrl: string, learnerId: string): Promise<LearnerProfile> {
  return request<LearnerProfile>({
    baseUrl,
    path: `/learner/${encodeURIComponent(learnerId)}`,
    timeoutMs: 30_000,
  });
}

export function upsertLearner(
  baseUrl: string,
  learnerId: string,
  body: { name?: string; language?: string; exam?: string; exam_date?: string },
): Promise<{ ok: boolean; profile: LearnerProfile }> {
  return request({
    baseUrl,
    path: `/learner/${encodeURIComponent(learnerId)}`,
    method: 'POST',
    json: body,
    timeoutMs: 30_000,
  });
}

export function recordObservation(
  baseUrl: string,
  learnerId: string,
  body: { topic: string; correct: boolean; note?: string },
): Promise<{ ok: boolean }> {
  return request({
    baseUrl,
    path: `/learner/${encodeURIComponent(learnerId)}/observation`,
    method: 'POST',
    json: body,
    timeoutMs: 30_000,
  });
}

export type ImageUpload = { uri: string; name: string; type: string };

/**
 * Photo of handwritten work in, first error + the tutor's opening question out.
 * Slow by nature (vision pass + a completion): budget 30-60s, longer if cold.
 */
export function diagnoseWork(
  baseUrl: string,
  args: { learnerId: string; problem?: string; image: ImageUpload },
): Promise<Diagnosis> {
  const form = new FormData();
  form.append('learner_id', args.learnerId);
  if (args.problem && args.problem.trim()) form.append('problem', args.problem.trim());
  // RN's FormData takes this {uri,name,type} shape for files; it is not a browser File.
  form.append('image', args.image as unknown as Blob);
  return request<Diagnosis>({ baseUrl, path: '/tutor/diagnose', method: 'POST', form });
}
