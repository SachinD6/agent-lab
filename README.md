# agent-lab

A small, complete AI agent project: a Mastra agent with a GitHub search tool, a Go trace server that records every run, and a five-question eval script.

Built during month 1 of learning how agents actually work — tools, traces, and tests, not just prompts.

Read the write-up: [Month 1: what I built](posts/month-1-what-i-built.md).

## What it does

- **Agent** — Mastra agent on Gemini (`google/gemini-3.5-flash-lite`) with conversation memory, a local workspace, and web fetching.
- **GitHub search** — typed tool that calls the GitHub REST API for public repositories, sorted by stars.
- **Traces** — an output processor posts one JSON record after every run to a local Go server, which prints it and appends it to `server/traces.json`.
- **Evals** — `npm run test:agent` asks five questions and prints PASS/FAIL for each one.

## Architecture

```text
Mastra Studio / HTTP API (:4111)
            |
      Agent (Gemini)
       |    |    |
       |    |    +-- workspace tools --> local files
       |    +------- web_fetch ---------> web pages
       +------------ github_search -----> GitHub REST API
            |
      trace processor (after each run)
            |
      POST /traces
            |
      Go server (:8090) --> server/traces.json
```

## Requirements

- Node.js 22.13 or newer
- Go 1.22 or newer
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Setup

```shell
git clone https://github.com/SachinD6/agent-lab.git
cd agent-lab
npm install
cp .env.example .env
# put GOOGLE_GENERATIVE_AI_API_KEY in .env
```

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `GITHUB_TOKEN` | Raises the GitHub search rate limit |
| `TRACE_SERVER_URL` | Trace server base URL (default `http://localhost:8090`) |

## Run

Start the trace server in one terminal:

```shell
cd server && go run .
```

Start the agent in another:

```shell
npm run dev
```

Open [http://localhost:4111](http://localhost:4111) for Mastra Studio, or call the API directly:

```shell
curl -X POST http://localhost:4111/api/agents/agent/generate \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Find the top 3 repos for mastra"}],"memory":{"thread":"demo","resource":"me"}}'
```

## Tests

With the agent running:

```shell
npm run test:agent
```

The five questions cover a direct reply, arithmetic, the GitHub tool, memory across two turns in one thread, and web fetching. The script exits non-zero if any question fails.

## Trace format

Each run appends one JSON object per line to `server/traces.json`:

```json
{"id":"78fa0013-c79a-42c9-8b69-60d2959433ac","timestamp":"2026-10-21T05:20:47.388Z","agent":"agent","text":"Run 1","finishReason":"stop","usage":{"inputTokens":7582,"outputTokens":3,"totalTokens":7585}}
```

Tracing is best-effort: if the server is down, the agent run still completes.

## Repo layout

```text
src/mastra/agents/agent.ts              Agent config and model
src/mastra/tools/github-search.ts       GitHub search tool
src/mastra/processors/trace-processor.ts Trace export after each run
server/main.go                          Go trace server
scripts/test-agent.mjs                  Five-question eval script
posts/month-1-what-i-built.md           Month 1 write-up
```

## Notes and limits

- The built-in `web_search` is disabled because Google Search grounding returns `429` on this free Gemini key. `web_fetch` works.
- Free-tier Gemini quotas can return `429` during heavy use.
- Unauthenticated GitHub search allows roughly 10 requests per minute.
- The trace server has no authentication and writes to `traces.json` without rotation. Keep it local.
- `traces.json` and `.env` are gitignored.
