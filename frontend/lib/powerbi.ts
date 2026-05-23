/** Power BI embed: to'liq iframe yoki src URL */
export function normalizePowerBiEmbedUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const m = t.match(/src=["']([^"']+)["']/i);
  if (m) return m[1];
  return t;
}

export function isValidPowerBiEmbedUrl(url: string): boolean {
  const u = normalizePowerBiEmbedUrl(url);
  if (!u) return false;
  try {
    const parsed = new URL(u.startsWith('http') ? u : `https://${u}`);
    const host = parsed.hostname.toLowerCase();
    return (
      host.includes('powerbi.com') ||
      host.includes('powerbi.microsoft.com') ||
      host.includes('pbidedicated.windows.net')
    );
  } catch {
    return false;
  }
}

export function powerBiOpenUrl(raw: string): string {
  const u = normalizePowerBiEmbedUrl(raw);
  return u.startsWith('http') ? u : `https://${u}`;
}
