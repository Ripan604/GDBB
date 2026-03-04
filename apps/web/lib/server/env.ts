export function getEngineBaseUrl() {
  return process.env.ENGINE_BASE_URL ?? 'http://localhost:8000';
}

export function boolEnv(name: string, defaultValue = false) {
  const value = process.env[name];
  if (value == null) return defaultValue;
  return value.toLowerCase() === 'true';
}

