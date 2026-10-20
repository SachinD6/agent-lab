import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const githubSearchTool = createTool({
  id: 'github_search',
  description: 'Search public GitHub repositories by keyword, sorted by stars.',
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe('Search keywords. GitHub qualifiers such as language:go or org:mastra-ai are supported.'),
    limit: z.number().int().min(1).max(10).default(5).describe('How many repositories to return.'),
  }),
  outputSchema: z.object({
    repositories: z.array(
      z.object({
        fullName: z.string(),
        description: z.string().nullable(),
        stars: z.number(),
        language: z.string().nullable(),
        url: z.string(),
      }),
    ),
  }),
  execute: async ({ query, limit }) => {
    const url = new URL('https://api.github.com/search/repositories');
    url.searchParams.set('q', query);
    url.searchParams.set('sort', 'stars');
    url.searchParams.set('order', 'desc');
    url.searchParams.set('per_page', String(limit));

    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'agent-lab',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub search failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      items: Array<{
        full_name: string;
        description: string | null;
        stargazers_count: number;
        language: string | null;
        html_url: string;
      }>;
    };

    return {
      repositories: data.items.map((repo) => ({
        fullName: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        language: repo.language,
        url: repo.html_url,
      })),
    };
  },
});
