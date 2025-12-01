interface Secrets {
  JIRA_HOST?: string;
  JIRA_EMAIL?: string;
  JIRA_API_TOKEN?: string;
  JIRA_PROJECT_KEY?: string;
  GITHUB_TOKEN?: string;
  GITHUB_ORG?: string;
  GEMINI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  SESSION_SECRET?: string;
}

let cachedSecrets: Secrets | null = null;

function getSecretsFromEnv(): Secrets {
  return {
    JIRA_HOST: process.env.JIRA_HOST,
    JIRA_EMAIL: process.env.JIRA_EMAIL,
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
    JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_ORG: process.env.GITHUB_ORG,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
}

export async function getSecrets(): Promise<Secrets> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  cachedSecrets = getSecretsFromEnv();
  return cachedSecrets;
}

export async function getSecret(key: keyof Secrets): Promise<string | undefined> {
  const secrets = await getSecrets();
  return secrets[key];
}

export function clearSecretsCache(): void {
  cachedSecrets = null;
}
