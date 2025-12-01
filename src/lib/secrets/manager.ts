import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

interface Secrets {
  JIRA_HOST?: string;
  JIRA_EMAIL?: string;
  JIRA_API_TOKEN?: string;
  JIRA_PROJECT_KEY?: string;
  GITHUB_TOKEN?: string;
  GITHUB_ORG?: string;
  GEMINI_API_KEY?: string;
  SESSION_SECRET?: string;
}

let cachedSecrets: Secrets | null = null;

async function getSecretsFromAWS(): Promise<Secrets> {
  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || "ap-northeast-1",
  });

  const secretName = process.env.AWS_SECRET_NAME || "story-pointer/secrets";

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (response.SecretString) {
      return JSON.parse(response.SecretString);
    }

    throw new Error("Secret value is empty");
  } catch (error) {
    console.error("Failed to retrieve secrets from AWS:", error);
    throw error;
  }
}

function getSecretsFromEnv(): Secrets {
  return {
    JIRA_HOST: process.env.JIRA_HOST,
    JIRA_EMAIL: process.env.JIRA_EMAIL,
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
    JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_ORG: process.env.GITHUB_ORG,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
}

export async function getSecrets(): Promise<Secrets> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && process.env.AWS_SECRET_NAME) {
    cachedSecrets = await getSecretsFromAWS();
  } else {
    cachedSecrets = getSecretsFromEnv();
  }

  return cachedSecrets;
}

export async function getSecret(key: keyof Secrets): Promise<string | undefined> {
  const secrets = await getSecrets();
  return secrets[key];
}

export function clearSecretsCache(): void {
  cachedSecrets = null;
}
