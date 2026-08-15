import { apiClient } from './client';
import type {
  SubjectWithSets,
  QuestionSetDetail,
  MocktestAttemptResult,
  MocktestAttemptSummary,
  MocktestAttemptDetail,
  PaginatedResult,
} from '@/types';

export async function getAllSubjects(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResult<SubjectWithSets>> {
  const { data } = await apiClient.get<PaginatedResult<SubjectWithSets>>('/mocktest/subjects', {
    params,
  });
  return data;
}

export async function getQuestionSet(setId: string): Promise<QuestionSetDetail> {
  const { data } = await apiClient.get<QuestionSetDetail>(`/mocktest/sets/${setId}`);
  return data;
}

export async function submitMocktest(payload: {
  questionSetId: string;
  timeTaken: number;
  answers: { questionId: string; selectedIndex: number | null }[];
}): Promise<MocktestAttemptResult> {
  const { data } = await apiClient.post<MocktestAttemptResult>('/mocktest/attempts', payload);
  return data;
}

export async function getAttempts(
  page = 1,
  limit = 10,
  filter?: 'recent',
): Promise<PaginatedResult<MocktestAttemptSummary>> {
  const params: Record<string, string | number> = { page, limit };
  if (filter) params.filter = filter;
  const { data } = await apiClient.get<PaginatedResult<MocktestAttemptSummary>>(
    '/mocktest/attempts',
    { params },
  );
  return data;
}

export async function getAttemptById(attemptId: string): Promise<MocktestAttemptDetail> {
  const { data } = await apiClient.get<MocktestAttemptDetail>(`/mocktest/attempts/${attemptId}`);
  return data;
}
