// Lê e valida as variáveis do .env. Chaves e senhas ficam SÓ no .env.
import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  PANEL_PASSWORD: z.string().min(1, "Defina PANEL_PASSWORD no .env"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET precisa ter pelo menos 32 caracteres"),
  ML_CLIENT_ID: z.string().optional().default(""),
  ML_CLIENT_SECRET: z.string().optional().default(""),
  ML_REDIRECT_URI: z.string().optional().default(""),
  ML_USE_PKCE: bool,
  ML_MOCK: bool,
  SHOPEE_ENABLED: bool,
  SHOPEE_APP_ID: z.string().optional().default(""),
  SHOPEE_SECRET: z.string().optional().default(""),
  SHOPEE_API_URL: z.string().optional().default("https://open-api.affiliate.shopee.com.br/graphql"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msgs = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuração inválida no .env:\n${msgs}`);
  }
  cached = parsed.data;
  return cached;
}
