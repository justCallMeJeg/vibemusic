export type Platform = "windows" | "macos" | "linux";

export interface PlatformAsset {
  url: string;
}

export interface ReleaseData {
  version: string;
  platforms: Record<string, PlatformAsset>;
}

const REPO = "justCallMeJeg/vibemusic";
const DOWNLOAD_PROXY = "https://vibemusic.gjpgabayeron.workers.dev";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const CACHE_KEY_STABLE = "vibemusic-release-stable";
const CACHE_KEY_NIGHTLY = "vibemusic-release-nightly";

interface CacheEntry {
  data: ReleaseData;
  timestamp: number;
}

function cacheGet(key: string): ReleaseData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function cacheSet(key: string, data: ReleaseData): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — skip
  }
}

export function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  return "linux";
}

export function platformJsonKey(platform: Platform): string {
  switch (platform) {
    case "windows": return "windows-x86_64";
    case "macos": return "darwin-aarch64";
    case "linux": return "linux-x86_64";
  }
}

function parseAssets(
  assets: {
    name: string;
    browser_download_url: string;
  }[],
): {
  version: string;
  platforms: Record<string, PlatformAsset>;
} {
  let version = "";
  const platforms: Record<string, PlatformAsset> = {};
  for (const asset of assets) {
    const name: string = asset.name;
    if (!version) {
      const m = name.match(/_(\d+\.\d+\.\d+)/);
      if (m) version = m[1];
    }
    const match64 = name.includes("x64") || name.includes("amd64");
    if (name.endsWith(".msi") && match64) {
      platforms["windows-x86_64"] = { url: asset.browser_download_url };
    } else if (name.endsWith(".AppImage") && match64) {
      platforms["linux-x86_64"] = { url: asset.browser_download_url };
    } else if (name.endsWith(".tar.gz") && name.includes("aarch64")) {
      platforms["darwin-aarch64"] = { url: asset.browser_download_url };
    } else if (name.endsWith(".tar.gz") && name.includes("x86_64")) {
      platforms["darwin-x86_64"] = { url: asset.browser_download_url };
    }
  }
  return { version, platforms };
}

async function fetchFromApi(url: string): Promise<ReleaseData | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "vibemusic-landing" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseAssets(data.assets ?? []);
  } catch {
    return null;
  }
}

export async function fetchNightly(): Promise<ReleaseData | null> {
  const cached = cacheGet(CACHE_KEY_NIGHTLY);
  if (cached) return cached;

  const data = await fetchFromApi(
    `https://api.github.com/repos/${REPO}/releases/tags/nightly`,
  );
  if (data?.version) cacheSet(CACHE_KEY_NIGHTLY, data);
  return data;
}

export async function fetchStable(): Promise<ReleaseData | null> {
  const cached = cacheGet(CACHE_KEY_STABLE);
  if (cached) return cached;

  const data = await fetchFromApi(
    `https://api.github.com/repos/${REPO}/releases/latest`,
  );
  if (data?.version) cacheSet(CACHE_KEY_STABLE, data);
  return data;
}

/** Download a file programmatically through the Cloudflare Worker proxy
 *  (which adds CORS headers). Falls back to `window.open` if the proxy
 *  is unreachable. Returns `true` if blob-downloaded, `false` otherwise. */
export async function downloadAsset(url: string): Promise<boolean> {
  try {
    const proxyUrl = `${DOWNLOAD_PROXY}/download?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
    const blob = await res.blob();
    const filename = url.split("/").pop() ?? "download";
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    window.open(url, "_blank");
    return false;
  }
}

/** Construct a direct download URL for the platform without needing the API.
 *  macOS assets don't include version numbers, so they're deterministic.
 *  For Windows/Linux nightly we use the rolling tag path (may 404 if filename
 *  pattern changes — but the download is handled in-page via downloadAsset). */
export function directUrl(platform: Platform, channel: "stable" | "nightly"): string {
  const tag = channel === "nightly" ? `download/nightly` : `latest/download`;
  switch (platform) {
    case "windows":
      return `https://github.com/${REPO}/releases/${tag}/Vibe.Music_x64_en-US.msi`;
    case "macos":
      return `https://github.com/${REPO}/releases/${tag}/Vibe.Music_aarch64.app.tar.gz`;
    case "linux":
      return `https://github.com/${REPO}/releases/${tag}/Vibe.Music_amd64.AppImage`;
  }
}
