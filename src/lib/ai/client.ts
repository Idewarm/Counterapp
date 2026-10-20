import "server-only";
import OpenAI from "openai";
import type { ChatCompletionContentPart, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ZodType } from "zod";

let client: OpenAI | null = null;

export function aiMode(): "openai" | "mock" {
  if (process.env.AI_MOCK === "1" || process.env.AI_MOCK === "true") return "mock";
  return process.env.OPENAI_API_KEY ? "openai" : "mock";
}

export function aiModel() {
  return process.env.OPENAI_MODEL || "gpt-4o";
}

function getClient() {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 120_000 });
  return client;
}

export class AIError extends Error {}

export interface StructuredRequest<T> {
  system: string;
  user: string | ChatCompletionContentPart[];
  /** Prior turns, for conversational calls */
  history?: ChatCompletionMessageParam[];
  schemaName: string;
  /** JSON Schema in OpenAI strict mode (all properties required, additionalProperties false) */
  jsonSchema: Record<string, unknown>;
  validator: ZodType<T>;
  temperature?: number;
  signal?: AbortSignal;
}

/**
 * One chat completion constrained to a JSON schema, validated with zod.
 * Retries once on malformed output before giving up.
 */
export async function structured<T>(req: StructuredRequest<T>): Promise<T> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: req.system },
    ...(req.history ?? []),
    { role: "user", content: req.user },
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await getClient().chat.completions.create(
      {
        model: aiModel(),
        messages,
        temperature: req.temperature ?? 0.8,
        response_format: {
          type: "json_schema",
          json_schema: { name: req.schemaName, schema: req.jsonSchema, strict: true },
        },
      },
      { signal: req.signal },
    );

    const message = completion.choices[0]?.message;
    if (message?.refusal) throw new AIError(`The AI declined the request: ${message.refusal}`);
    if (completion.choices[0]?.finish_reason === "length") {
      lastError = new AIError("The AI response was cut off (too long).");
      continue;
    }
    try {
      const parsed = req.validator.safeParse(JSON.parse(message?.content ?? ""));
      if (parsed.success) return parsed.data;
      lastError = parsed.error;
    } catch (err) {
      lastError = err;
    }
  }
  throw new AIError(`The AI returned an invalid response: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

/** Helpers to keep JSON schemas terse. */
export const js = {
  str: (description?: string) => ({ type: "string", ...(description ? { description } : {}) }),
  int: (description?: string) => ({ type: "integer", ...(description ? { description } : {}) }),
  nullable: (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] }),
  arr: (items: Record<string, unknown>, description?: string) => ({
    type: "array",
    items,
    ...(description ? { description } : {}),
  }),
  obj: (properties: Record<string, Record<string, unknown>>) => ({
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  }),
};
