export type AuthConfig = {
  username: string;
  password: string;
  sessionSecret: string;
  cookieSecure: boolean;
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function getAuthConfig(): AuthConfig {
  const username = process.env.PORT_MANAGER_USERNAME;
  const password = process.env.PORT_MANAGER_PASSWORD;
  const sessionSecret = process.env.PORT_MANAGER_SESSION_SECRET;

  if (!username || !password || !sessionSecret) {
    throw new ConfigError(
      "PORT_MANAGER_USERNAME, PORT_MANAGER_PASSWORD, and PORT_MANAGER_SESSION_SECRET are required."
    );
  }
  if (sessionSecret.length < 32) {
    throw new ConfigError("PORT_MANAGER_SESSION_SECRET must be at least 32 characters.");
  }

  const secureOverride = process.env.PORT_MANAGER_COOKIE_SECURE;
  const cookieSecure =
    secureOverride === undefined ? process.env.NODE_ENV === "production" : secureOverride === "true";

  return {
    username,
    password,
    sessionSecret,
    cookieSecure
  };
}
