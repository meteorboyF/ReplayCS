import { json } from '@sveltejs/kit';

export function GET() {
  return json(
    {
      status: 'ok',
      app: 'ReplayCS',
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      version:
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.GIT_COMMIT_SHA ||
        process.env.VERCEL_URL ||
        'development'
    },
    {
      headers: {
        'cache-control': 'no-store'
      }
    }
  );
}
