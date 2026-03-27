/**
 * Shared formatting helpers for UI display.
 */

export function truncateAddress(addr) {
  if (!addr || addr.length < 10) return addr || '?';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const MAX_THREAD_DEPTH = 6;
const PX_PER_DEPTH = 24;

export function threadIndent(depth) {
  return `${Math.min(depth || 0, MAX_THREAD_DEPTH) * PX_PER_DEPTH}px`;
}

export function formatLinkDisplay(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (/^https?:$/.test(parsed.protocol)) {
      return parsed.hostname.replace(/^www\./, '');
    }
    const scheme = parsed.protocol.replace(':', '');
    const path = url.slice(parsed.protocol.length + 2);
    if (path.length > 20) {
      return `${scheme}://${path.slice(0, 8)}...${path.slice(-6)}`;
    }
    return `${scheme}://${path}`;
  } catch {
    return url.length > 30 ? url.slice(0, 15) + '...' + url.slice(-10) : url;
  }
}
