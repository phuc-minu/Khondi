import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  ENVIRONMENT: z.enum(["local", "ci", "dev"]),
  API_BASE_URL: z.string().url(),
});

export type Settings = z.infer<typeof schema>;

export function loadSettings(): Settings {
  try {
    return schema.parse({
      PORT: process.env.PORT,
      ENVIRONMENT: process.env.ENVIRONMENT,
      API_BASE_URL: process.env.API_BASE_URL,
    });
  } catch (error) {
    const issue = error instanceof z.ZodError ? error.issues[0] : undefined;
    const variable = issue?.path[0] === undefined ? "configuration" : String(issue.path[0]);
    throw new Error(`${variable} is missing or invalid`);
  }
}
