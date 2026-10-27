const SECTIONS = ['Triage', 'Navigate', 'Splits', 'Compose', 'View', 'Account'];

const RECENT_SHOWN = 5;

function greedyScore(q, t, start) {
  let score = 0;
  let from = start;
  let prev = start - 2;
  for (const ch of q) {
    const i = t.indexOf(ch, from);
    if (i < 0) return null;
    if (i === prev + 1) score += 3;
    if (i === 0 || !/[a-z0-9]/.test(t[i - 1])) score += 2;
    score -= Math.min(i - from, 5) * 0.1;
    prev = i;
    from = i + 1;
  }
  return score;
}

// Subsequence match. Higher is better, null means no match.
// Greedy from every occurrence of the first letter, so "mo" finds "mode" past "calm".
export function fuzzyScore(query, text) {
  const q = query.toLowerCase().replace(/\s+/g, '');
  const t = text.toLowerCase();
  if (q === '') return 0;
  let best = null;
  for (let s = t.indexOf(q[0]); s >= 0; s = t.indexOf(q[0], s + 1)) {
    const score = greedyScore(q, t, s);
    if (score !== null && (best === null || score > best)) best = score;
  }
  return best;
}

// Returns [{ title: string, commands: Command[] }] in display order.
export function rankCommands(commands, query, recentIds) {
  if (query.trim() !== '') {
    const hits = commands
      .map((command, order) => ({ command, order, score: fuzzyScore(query, command.title) }))
      .filter((h) => h.score !== null)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .map((h) => h.command);
    return hits.length > 0 ? [{ title: 'Results', commands: hits }] : [];
  }
  const byId = new Map(commands.map((c) => [c.id, c]));
  const recent = recentIds.map((id) => byId.get(id)).filter(Boolean).slice(0, RECENT_SHOWN);
  const shown = new Set(recent);
  const groups = recent.length > 0 ? [{ title: 'Recent', commands: recent }] : [];
  for (const section of SECTIONS) {
    const inSection = commands.filter((c) => c.section === section && !shown.has(c));
    if (inSection.length > 0) groups.push({ title: section, commands: inSection });
  }
  return groups;
}
