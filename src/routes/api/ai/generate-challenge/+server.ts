import { json } from '@sveltejs/kit';
export async function POST() {
  return json({
    available: false,
    message: 'Challenge generation requires a configured API key and validated lesson template.',
    challenge: null
  });
}
