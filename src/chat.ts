import type { Study } from './studies';
import type { DiagramAttachment, DiagramContext } from './mcp';

export type StudyChatTurn = { role: 'user' | 'assistant'; content: string };

export async function sendStudyMessage(
  study: Study,
  history: StudyChatTurn[],
  message: string,
  diagramContext: DiagramContext[] = [],
): Promise<{ answer: string; apps: DiagramAttachment[]; warnings: string[] }> {
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
      diagramContext,
    }),
    signal: AbortSignal.timeout(125000),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message || 'The study assistant could not respond. Try again shortly.');
  }
  const result = (await response.json()) as {
    answer?: unknown;
    apps?: DiagramAttachment[];
    warnings?: string[];
  };
  if (typeof result.answer !== 'string')
    throw new Error('The study assistant returned an invalid response.');
  return { answer: result.answer, apps: result.apps ?? [], warnings: result.warnings ?? [] };
}
