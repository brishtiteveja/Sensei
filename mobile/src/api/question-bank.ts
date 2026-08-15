import { apiClient } from './client';
import type {
  QuestionBankUniversity,
  QuestionBankSubjectWithSets,
  QuestionBankQuestionSetDetail,
} from '@/types';

export async function getUniversities(): Promise<QuestionBankUniversity[]> {
  const { data } = await apiClient.get<QuestionBankUniversity[]>('/question-bank/universities');
  return data;
}

export async function getSubjects(universityId: string): Promise<QuestionBankSubjectWithSets[]> {
  const { data } = await apiClient.get<QuestionBankSubjectWithSets[]>(
    `/question-bank/universities/${universityId}/subjects`,
  );
  return data;
}

export async function getQuestionSet(setId: string): Promise<QuestionBankQuestionSetDetail> {
  const { data } = await apiClient.get<QuestionBankQuestionSetDetail>(
    `/question-bank/sets/${setId}`,
  );
  return data;
}
