// Shared by the HTML renderer and the MCP section index.
export function headingId(html, used) {
  const base = html.replace(/<[^>]*>/g, '').replace(/&(?:[a-z]+|#\d+|#x[0-9a-f]+);/gi, '').toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/\s/g, '-');
  let count = used.get(base) || 0;
  let id = count ? `${base}-${count}` : base;
  while (used.has(id)) id = `${base}-${++count}`;
  used.set(base, count + 1);
  used.set(id, Math.max(used.get(id) || 0, 1));
  return id;
}
