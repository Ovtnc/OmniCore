/**
 * Format a date as relative time (e.g. "2 saat önce", "Bugün, 14:30")
 */
export function formatRelativeTime(date: Date, base: Date = new Date()): string {
  const d = new Date(date);
  const now = new Date(base);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const wasYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();

  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24 && sameDay) return `Bugün, ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (wasYesterday) return `Dün, ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `${diffDays} gün önce`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;

  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}
