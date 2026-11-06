import 'dotenv/config';
import { streamText, tool, isStepCount } from 'ai';
import { z } from 'zod';
import { assistantModel, assistantProviderOptions, webSearchTool } from '../services/assistant/model.js';

const runCase = async (label: string, prompt: string, tools: Parameters<typeof streamText>[0]['tools']) => {
  console.log(`\n=== ${label} ===`);
  const result = streamText({
    model: assistantModel(),
    instructions: 'Use the tools. Answer in one short sentence.',
    prompt,
    tools,
    stopWhen: isStepCount(4),
    providerOptions: assistantProviderOptions('admin'),
    onStepEnd: (step) => {
      console.log('step', step.stepNumber, 'calls:', step.toolCalls.map((c) => c.toolName).join(',') || '-');
    },
  });
  let text = '';
  for await (const chunk of result.textStream) text += chunk;
  console.log('final:', text);
  const sources = await result.sources;
  if (sources.length) console.log('sources:', sources.slice(0, 3).map((s) => ('url' in s ? s.url : s.id)));
};

const main = async () => {
  await runCase('multi-step tools, store:false', 'Call get_number, then double it, then state the result.', {
    get_number: tool({ description: 'Returns a number', inputSchema: z.object({}), execute: async () => ({ n: 21 }) }),
    double: tool({
      description: 'Doubles n',
      inputSchema: z.object({ n: z.number() }),
      execute: async ({ n }) => ({ result: n * 2 }),
    }),
  });
  await runCase('web search, store:false', 'What is the date of Diwali in 2026?', { web_search: webSearchTool() });
};

main().catch((err) => {
  console.error('SPIKE FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
