#!/usr/bin/env node

const baseUrl = process.env.MASTRA_URL ?? 'http://localhost:4111';
const agentId = process.env.AGENT_ID ?? 'agent';
const resource = 'agent-lab-evals';

const newThread = () => `eval-${crypto.randomUUID()}`;

async function generate(prompt, thread) {
  const res = await fetch(`${baseUrl}/api/agents/${agentId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      memory: { thread, resource },
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

const textOf = (data) => data.text ?? '';
const toolsOf = (data) => (data.toolCalls ?? []).map((call) => call.payload?.toolName);
const clean = (text) => text.trim().replace(/[.!]+$/, '');

const tests = [
  {
    name: 'Replies to a direct instruction',
    expected: 'PONG',
    run: () => generate('Reply with exactly: PONG', newThread()),
    check: (data) => clean(textOf(data)) === 'PONG',
  },
  {
    name: 'Does arithmetic',
    expected: '391',
    run: () => generate('What is 17 * 23? Reply with only the number.', newThread()),
    check: (data) => clean(textOf(data)) === '391',
  },
  {
    name: 'Uses the GitHub search tool',
    expected: 'github_search called and mastra-ai/mastra returned',
    run: () =>
      generate(
        "Use github_search with query 'mastra' and limit 3. Reply with only the repository full names.",
        newThread(),
      ),
    check: (data) => toolsOf(data).includes('github_search') && textOf(data).toLowerCase().includes('mastra-ai/mastra'),
  },
  {
    name: 'Remembers an earlier turn in the same thread',
    expected: 'teal',
    run: async () => {
      const thread = newThread();
      await generate('My favourite colour is teal. Reply OK.', thread);
      return generate('What is my favourite colour? Reply with just the colour.', thread);
    },
    check: (data) => textOf(data).toLowerCase().includes('teal'),
  },
  {
    name: 'Fetches a web page',
    expected: 'Example Domain',
    run: () =>
      generate(
        "Use web_fetch to fetch https://example.com and reply with the page's main heading only.",
        newThread(),
      ),
    check: (data) =>
      toolsOf(data).includes('web_fetch') && textOf(data).toLowerCase().includes('example domain'),
  },
];

console.log(`Running ${tests.length} tests against ${baseUrl} (agent: ${agentId})\n`);

let failed = 0;

for (const [index, test] of tests.entries()) {
  const started = Date.now();
  let passed = false;
  let detail = '';

  try {
    const data = await test.run();
    passed = test.check(data);
    detail = textOf(data).replace(/\s+/g, ' ').slice(0, 100);
    if (!passed) detail += ` | tools: ${toolsOf(data).join(', ') || 'none'}`;
  } catch (error) {
    detail = error instanceof Error ? error.message : String(error);
  }

  if (!passed) failed++;
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `${passed ? 'PASS' : 'FAIL'}  ${index + 1}. ${test.name} (${seconds}s)\n      expected: ${test.expected}\n      got: ${detail}`,
  );
}

console.log(`\n${tests.length - failed} passed, ${failed} failed`);
process.exitCode = failed > 0 ? 1 : 0;
