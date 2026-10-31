import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenRouter, OpenRouterError } from '@langchain/openrouter';
import { ExcalidrawMcpService } from '../mcp/excalidraw-mcp.service.js';
import { runStudyAgent, type DiagramContext, type StudyAgentReply } from './study-agent.js';
import { z } from 'zod';

type ChatTurn = { role: 'user' | 'assistant'; content: string };
type StudyContext = {
  title: string;
  category: string;
  description: string;
  learningGoals: string[];
};
type ChatInput = {
  study: StudyContext;
  history: ChatTurn[];
  message: string;
  diagramContext: DiagramContext[];
};

const StudyChatState = Annotation.Root({
  study: Annotation<StudyContext>(),
  history: Annotation<ChatTurn[]>(),
  message: Annotation<string>(),
  answer: Annotation<string>(),
  diagramContext: Annotation<DiagramContext[]>(),
  apps: Annotation<StudyAgentReply['apps']>(),
  warnings: Annotation<string[]>(),
});

function parseChatInput(input: unknown): ChatInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('Expected study chat details.');
  }
  const body = input as Record<string, unknown>;
  const study = body.study;
  if (!study || typeof study !== 'object' || Array.isArray(study)) {
    throw new BadRequestException('Expected study details.');
  }
  const details = study as Record<string, unknown>;
  const learningGoals = details.learningGoals === undefined ? [] : details.learningGoals;
  const diagramContext = z
    .array(z.object({ appId: z.uuid(), summary: z.string().max(8000) }).strict())
    .max(4)
    .safeParse(body.diagramContext ?? []);
  if (
    typeof details.title !== 'string' ||
    !details.title.trim() ||
    details.title.length > 90 ||
    typeof details.category !== 'string' ||
    details.category.length > 80 ||
    typeof details.description !== 'string' ||
    details.description.length > 220 ||
    !Array.isArray(learningGoals) ||
    learningGoals.length > 10 ||
    learningGoals.some(
      (goal) => typeof goal !== 'string' || !goal.trim() || goal.trim().length > 180,
    ) ||
    typeof body.message !== 'string' ||
    !body.message.trim() ||
    body.message.length > 4000 ||
    !Array.isArray(body.history) ||
    body.history.length > 40 ||
    body.history.some(
      (turn) =>
        !turn ||
        typeof turn !== 'object' ||
        !['user', 'assistant'].includes((turn as Record<string, unknown>).role as string) ||
        typeof (turn as Record<string, unknown>).content !== 'string' ||
        ((turn as Record<string, unknown>).content as string).length > 4000,
    ) ||
    !diagramContext.success ||
    Object.keys(body).some(
      (key) => !['study', 'history', 'message', 'diagramContext'].includes(key),
    )
  ) {
    throw new BadRequestException('Study chat input is invalid or exceeds the conversation limit.');
  }

  return {
    study: {
      title: details.title.trim(),
      category: details.category.trim(),
      description: details.description.trim(),
      learningGoals: (learningGoals as string[]).map((goal) => goal.trim()),
    },
    history: body.history as ChatTurn[],
    message: body.message.trim(),
    diagramContext: diagramContext.data!,
  };
}

@Injectable()
export class StudyChatService {
  private readonly logger = new Logger(StudyChatService.name);

  constructor(private readonly mcp: ExcalidrawMcpService) {}

  async reply(input: unknown): Promise<StudyAgentReply> {
    const chat = parseChatInput(input);
    if (!process.env.OPENROUTER_API_KEY) {
      throw new ServiceUnavailableException(
        'Study chat is not configured. Set OPENROUTER_API_KEY on the API server.',
      );
    }

    const modelId = process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-6-luna';
    const model = new ChatOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: modelId,
    });

    const graph = new StateGraph(StudyChatState)
      .addNode('respond', async (state) => {
        const systemPrompt = [
          'You are Athena, a friendly study guide. Help the learner understand and remember ideas.',
          'Be accurate, clear, and concise. Ask a focused follow-up question when it would help.',
          'Use the study details as context, but do not invent source material or claim to have read uploaded sources.',
          `Study: ${state.study.title}`,
          `Category: ${state.study.category}`,
          `Description: ${state.study.description || 'No description provided.'}`,
          `Learning goals: ${state.study.learningGoals.length ? state.study.learningGoals.join('; ') : 'No learning goals provided.'}`,
        ].join('\n');
        return runStudyAgent(
          model,
          [
            { role: 'system', content: systemPrompt },
            ...state.history.map((turn) => ({ role: turn.role, content: turn.content })),
            { role: 'user', content: state.message },
          ],
          this.mcp,
          state.diagramContext,
        );
      })
      .addEdge(START, 'respond')
      .addEdge('respond', END)
      .compile();

    try {
      const result = await graph.invoke({ ...chat, answer: '', apps: [], warnings: [] });
      if (!result.answer.trim()) throw new Error('The model returned an empty response.');
      return { answer: result.answer.trim(), apps: result.apps, warnings: result.warnings };
    } catch (error) {
      if (OpenRouterError.isInstance(error)) {
        this.logger.error(
          `OpenRouter request failed (model=${modelId}, status=${error.statusCode ?? 'unknown'}, code=${error.code ?? 'unknown'}).`,
        );

        if (error.statusCode === 401 || error.statusCode === 403) {
          throw new ServiceUnavailableException(
            'OpenRouter rejected the API server credentials or model access. Check OPENROUTER_API_KEY and model access.',
          );
        }
        if (error.statusCode === 402) {
          throw new ServiceUnavailableException(
            'OpenRouter could not process the request. Check the account credits and billing settings.',
          );
        }
        if (error.statusCode === 429) {
          throw new ServiceUnavailableException(
            'The selected model is temporarily rate limited. Try again shortly.',
          );
        }
        if (error.statusCode === 400 || error.statusCode === 404) {
          throw new BadGatewayException(
            'OpenRouter rejected the selected model request. Check OPENROUTER_MODEL and model access.',
          );
        }
      } else {
        const errorName = error instanceof Error ? error.name : typeof error;
        this.logger.error(`OpenRouter request failed (model=${modelId}, error=${errorName}).`);
      }

      throw new BadGatewayException(
        'The study assistant could not reach the selected model. Try again shortly.',
      );
    }
  }
}
