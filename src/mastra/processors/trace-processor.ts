import type { OutputProcessor } from '@mastra/core/processors';

const traceUrl = `${process.env.TRACE_SERVER_URL ?? 'http://localhost:8090'}/traces`;

export const traceProcessor: OutputProcessor = {
  id: 'trace-exporter',
  processOutputResult: async ({ messages, result, agent }) => {
    const record = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agent: agent?.id ?? 'agent',
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
    };

    try {
      const res = await fetch(traceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) {
        throw new Error(`trace server returned ${res.status}`);
      }
    } catch (error) {
      // Tracing must never break an agent run.
      console.warn('trace export failed:', error);
    }

    return messages;
  },
};
