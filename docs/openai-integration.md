# OpenAI integration

All calls originate in SvelteKit server code. `client.ts` reads `OPENAI_API_KEY`; `tutor.ts` uses the Responses API with a Zod structured format and grounds the response in a deterministic `StepContext`. The model never generates the canonical trace. Exact predictions are scored locally.

Routes validate size and shape, omit stack traces, apply a small in-memory rate limit to explanations, bound output, time out, retry once, and return a deterministic fallback. Production deployments should replace in-memory limiting/caching with a shared store and attach a stable privacy-preserving user safety identifier.

Add `OPENAI_API_KEY` and optional `OPENAI_MODEL` to `.env`. Never use public-prefixed variables or expose the key to browser code. The default follows the requested `gpt-5.6` configuration.
