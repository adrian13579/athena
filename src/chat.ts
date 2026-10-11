import type { Study } from './studies';

export type StudyChatTurn = { role: 'user' | 'assistant'; content: string };

export async function sendStudyMessage(
  study: Study,
  history: StudyChatTurn[],
  message: string,
): Promise<string> {
  const response = await fetch('/api/chat/study', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      study: {
        title: study.title,
        category: study.category,
        description: study.description,
        learningGoals: study.learningGoals ?? [],
      },
      history,
      message,
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message || 'The study assistant could not respond. Try again shortly.');
  }
  const result = (await response.json()) as { answer?: unknown };
  if (typeof result.answer !== 'string')
    throw new Error('The study assistant returned an invalid response.');
  return result.answer;
}
