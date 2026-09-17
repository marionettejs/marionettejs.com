// Shared by the HTML renderer and the MCP section index.
export function headingId(html, used) {
  const base = html.replace(/<[^>]*>/g, '').replace(/&(?:[a-z]+|#\d+|#x[0-9a-f]+);/gi, '').toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/\s/g, '-');
  const count = used.get(base) || 0;
  used.set(base, count + 1);
  return count ? `${base}-${count}` : base;
}
