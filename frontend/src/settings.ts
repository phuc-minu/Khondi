import { z } from "zod";

// Compose passes an optional variable that .env leaves out as an empty string, not as unset.
const unsetIfEmpty = (value: unknown): unknown => (value === "" ? undefined : value);

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  ENVIRONMENT: z.enum(["local", "ci", "dev"]),
  API_BASE_URL: z.string().url(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(unsetIfEmpty, z.string().url().optional()),
  DIAGNOSTICS_ENABLED: z.preprocess(
    unsetIfEmpty,
    z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  ),
});

export type Settings = z.infer<typeof schema>;

export function loadSettings(): Settings {
  try {
    return schema.parse({
      PORT: process.env.PORT,
      ENVIRONMENT: process.env.ENVIRONMENT,
      API_BASE_URL: process.env.API_BASE_URL,
      OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      DIAGNOSTICS_ENABLED: process.env.DIAGNOSTICS_ENABLED,
    });
  } catch (error) {
    const issue = error instanceof z.ZodError ? error.issues[0] : undefined;
    const variable = issue?.path[0] === undefined ? "configuration" : String(issue.path[0]);
    throw new Error(`${variable} is missing or invalid`);
  }
}
