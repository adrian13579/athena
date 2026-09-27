export type Study = {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  sources: number;
  date: string;
  updatedAt: string;
};
export type CreateStudy = Pick<Study, 'id' | 'title' | 'description' | 'color'>;

export class StudyRequestError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 409
        ? 'This study ID is already in use. Retry to create a new study.'
        : 'Could not save the study. Check your input and try again.',
    );
  }
}
export async function loadStudies(signal: AbortSignal): Promise<Study[]> {
  const response = await fetch('/api/studies', { signal });
  if (!response.ok) throw new StudyRequestError(response.status);
  return response.json();
}
export async function createStudy(study: CreateStudy): Promise<Study> {
  const response = await fetch('/api/studies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(study),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new StudyRequestError(response.status);
  return response.json();
}
