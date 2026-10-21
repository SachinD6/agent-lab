# Month 1: what I built

Month 1 was about building one small agent end to end instead of collecting tutorials.

The result is [agent-lab](https://github.com/SachinD6/agent-lab): a Mastra agent running on Gemini, with a GitHub search tool, a Go trace server, and five automated checks. It is small on purpose. Each piece exists so I could learn one part of how agents work in production.

## The pieces

**The agent.** It started as Mastra's Agent Harness template, which already gives you memory, a local workspace, file and shell tools, and schedules. I swapped the model to Gemini and added `github_search`: a typed tool with a small input schema that calls GitHub's repository search API and returns name, description, stars, language, and URL.

**The trace server.** A small Go server exposes `POST /traces`. After every agent run, a Mastra output processor posts one JSON record with the output text, finish reason, token usage, and timestamp. The server prints the record and appends it to `traces.json`. Tracing is best-effort: if the server is down, the agent still answers.

**The evals.** `npm run test:agent` asks five questions: a direct reply, arithmetic, a GitHub search, memory across two turns in one thread, and a web fetch. It prints PASS or FAIL for each one. Running it turned vague "seems to work" into a number I could check in seconds.

## What I learned

- A tool is just a typed function with a description good enough for the model to choose it. The hard part is the schema and the error message, not the API call.
- Traces first. Seeing the exact request, tokens, and finish reason explained failures that looked like model bugs.
- Evals are cheap to start. Five questions caught more than hours of manual chat.
- Free tiers decide architecture. Google Search grounding returned `429` on my Gemini key, so I removed `web_search` and kept `web_fetch`; an OpenCode plan limit pushed me to Gemini in the first place. The project is shaped by the quotas it can afford.
- The boring parts matter most: a body size limit, valid-JSON check, one record per line, and a server that can be down without breaking the agent.

## What's next

Streaming traces, auth on the trace server, a web search provider that works on a free plan, and more eval questions. Month 2 is about making the thing survive contact with more than me.
