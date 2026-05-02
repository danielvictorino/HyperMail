export function hasHeaderLineBreak(value: string): boolean {
  return /[\r\n]/.test(value);
}

export function assertSingleLineHeaderValue(field: string, value: string): void {
  if (hasHeaderLineBreak(value)) {
    throw new Error(`${field} cannot contain line breaks.`);
  }
}

export function isAllowedDevServerNavigation(
  rawUrl: string,
  rawDevServerUrl: string
): boolean {
  try {
    return new URL(rawUrl).origin === new URL(rawDevServerUrl).origin;
  } catch {
    return false;
  }
}

export function isLoopbackHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.username.length === 0 &&
      parsed.password.length === 0 &&
      isLoopbackHost(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function isSafeRemoteHttpsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return (
      parsed.protocol === "https:" &&
      parsed.username.length === 0 &&
      parsed.password.length === 0 &&
      !isLocalOrPrivateHost(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function isSafeUnsubscribeEndpoint(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol === "mailto:") {
      return parsed.username.length === 0 && parsed.password.length === 0;
    }

    return isSafeRemoteHttpsUrl(rawUrl);
  } catch {
    return false;
  }
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);

  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return true;
  }

  const ipv4 = parseIpv4(normalized);
  if (ipv4) {
    return ipv4[0] === 127;
  }

  return normalized === "::1" || normalized === "0:0:0:0:0:0:0:1";
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  const ipv4 = parseIpv4(normalized);
  if (ipv4) {
    return isPrivateIpv4(ipv4);
  }

  if (!normalized.includes(".") && !normalized.includes(":")) {
    return true;
  }

  return isPrivateIpv6(normalized);
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

function parseIpv4(hostname: string): [number, number, number, number] | null {
  const octets = hostname.split(".");

  if (octets.length !== 4) {
    return null;
  }

  const parsed = octets.map((octet) => {
    if (!/^\d{1,3}$/.test(octet)) {
      return Number.NaN;
    }
    return Number.parseInt(octet, 10);
  });

  if (parsed.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return parsed as [number, number, number, number];
}

function isPrivateIpv4([first, second]: [number, number, number, number]): boolean {
  if (first === 0 || first === 10 || first === 127) return true;
  if (first === 100 && second >= 64 && second <= 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first >= 224) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  if (hostname === "::" || hostname === "::1" || hostname === "0:0:0:0:0:0:0:1") {
    return true;
  }

  if (
    hostname.startsWith("fe80:") ||
    hostname.startsWith("ff") ||
    hostname.startsWith("::ffff:")
  ) {
    return true;
  }

  const firstSegment = hostname.split(":")[0] ?? "";
  const firstByte = Number.parseInt(firstSegment.slice(0, 2), 16);

  if (!Number.isNaN(firstByte) && (firstByte & 0xfe) === 0xfc) {
    return true;
  }

  const ipv4Mapped = hostname.match(/^(?:::ffff:)?(.+\..+\..+\..+)$/);
  if (ipv4Mapped?.[1]) {
    const ipv4 = parseIpv4(ipv4Mapped[1]);
    return ipv4 ? isPrivateIpv4(ipv4) : false;
  }

  return false;
}
