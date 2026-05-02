export type ContentSecurityPolicyOptions = {
  devServerUrl?: string;
  includeFrameAncestors?: boolean;
};

const remoteApiOrigins = [
  "https://www.googleapis.com",
  "https://oauth2.googleapis.com",
  "https://gmail.googleapis.com",
  "https://graph.microsoft.com",
  "https://login.microsoftonline.com",
  "https://api.openai.com",
  "https://api.anthropic.com"
];

const localAiOrigins = ["http://127.0.0.1:11434", "http://localhost:11434"];

export function buildContentSecurityPolicy({
  devServerUrl,
  includeFrameAncestors = true
}: ContentSecurityPolicyOptions = {}): string {
  const isDev = Boolean(devServerUrl);
  const devConnect = isDev ? [`${devServerUrl}`, "ws://127.0.0.1:5173"] : [];
  const devScript = isDev
    ? [`${devServerUrl}`, "'unsafe-eval'", "'unsafe-inline'"]
    : [];

  const directives = [
    "default-src 'self'",
    ["script-src 'self'", ...devScript].join(" "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    ["connect-src 'self'", ...remoteApiOrigins, ...localAiOrigins, ...devConnect].join(
      " "
    ),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'"
  ];

  if (includeFrameAncestors) {
    directives.splice(6, 0, "frame-ancestors 'none'");
  }

  return directives.join("; ");
}
