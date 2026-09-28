import type { ApiClient } from './types';
import { suggestedBriefs } from '../data/suggestedBriefs';
import type { ApiErrorEnvelope } from '../types/course';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!isRecord(value) || !isRecord(value.error)) return false;
  const { code, message, details } = value.error;
  return typeof code === 'string'
    && typeof message === 'string'
    && Array.isArray(details)
    && details.every((detail) => typeof detail === 'string');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (response.ok) throw new Error('The API returned an unreadable response.');
  }

  if (!response.ok) {
    if (isApiErrorEnvelope(payload)) {
      const details = payload.error.details.length > 0
        ? ` ${payload.error.details.join(' ')}`
        : '';
      throw new Error(`${payload.error.message}${details}`);
    }
    throw new Error(`The API request failed with status ${response.status}.`);
  }

  return payload as T;
}

function post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body), headers });
}

export const liveClient: ApiClient = {
  getHealth: () => request('/health'),
  listCourses: () => request('/courses'),
  getCourse: (courseId) => request(`/courses/${encodeURIComponent(courseId)}`),
  generateCourse: (input, generationId) => post(
    '/courses/generate',
    input,
    generationId ? { 'X-Generation-ID': generationId } : undefined,
  ),
  getGenerationProgress: (generationId, after) => request(
    `/generation/${encodeURIComponent(generationId)}?after=${after}`,
    { cache: 'no-store' },
  ),
  importCourse: (course) => post('/courses/import', course),
  generateNextLecture: (courseId, lectureId, generationId) => request(
    `/courses/${encodeURIComponent(courseId)}/lectures/generate-next${lectureId ? `?lectureId=${encodeURIComponent(lectureId)}` : ''}`,
    {
      method: 'POST',
      headers: generationId ? { 'X-Generation-ID': generationId } : undefined,
    },
  ),
  generateAssignment: (courseId, input) => post(
    `/courses/${encodeURIComponent(courseId)}/assignments/generate`,
    input,
  ),
  generateMidterm: (courseId, input) => post(
    `/courses/${encodeURIComponent(courseId)}/midterms/generate`,
    input,
  ),
  generateFinal: (courseId, input) => post(
    `/courses/${encodeURIComponent(courseId)}/finals/generate`,
    input,
  ),
  listSuggestedBriefs: async () => [...suggestedBriefs],
};