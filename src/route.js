const LIST_ROOT_ARITY = {
  inbox: 1,
  starred: 1,
  snoozed: 1,
  sent: 1,
  drafts: 1,
  all: 1,
  spam: 1,
  trash: 1,
  imp: 1,
  scheduled: 1,
  search: 2,
  label: 2,
  category: 2,
  'advanced-search': 2,
};

// The thread-id test of the gmail.js library's current_page. It keeps #inbox/p2 (pagination) a list.
const THREAD_ID = /^[0-9a-zA-Z]{16,}$/;

const INBOX_QUERY = 'in:inbox';

function decodeQuery(segment) {
  const spaced = segment.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
}

function normalizeQuery(query) {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Route: { view: 'list' | 'thread' | 'other', query: string | null }
export function parseRoute(hash) {
  const path = hash.replace(/^#/, '').split('?')[0] || 'inbox';
  const parts = path.split('/');
  const arity = LIST_ROOT_ARITY[parts[0]];
  if (!arity || parts.length < arity) return { view: 'other', query: null };
  const view = parts.slice(arity).some((s) => THREAD_ID.test(s)) ? 'thread' : 'list';
  let query = null;
  if (parts[0] === 'inbox') query = INBOX_QUERY;
  else if (parts[0] === 'search') query = normalizeQuery(decodeQuery(parts[1]));
  return { view, query };
}

export function labelName(hash) {
  const match = /^#label\/([^/?]+)/.exec(hash);
  return match ? decodeQuery(match[1]) : null;
}

export function splitHash(query) {
  return normalizeQuery(query) === INBOX_QUERY ? '#inbox' : `#search/${encodeURIComponent(query)}`;
}

export function activeSplitIndex(splits, hash) {
  const { query } = parseRoute(hash);
  if (query === null) return -1;
  return splits.findIndex((s) => normalizeQuery(s.query) === query);
}

export function cycleSplitIndex(count, active, delta) {
  if (count === 0) return -1;
  if (active < 0) return delta > 0 ? 0 : count - 1;
  return (active + delta + count) % count;
}

// Gmail empties its reading pane when the hash changes to page 1 of the list, then rewrites the hash to the list's
// own. It ignores a hash it has already routed in this page load, so each close needs a new nonce. Past page 1, or
// with a ?compose in the hash, there is no plain list hash to go back to.
export function closePaneHash(hash, nonce) {
  if (parseRoute(hash).view !== 'list' || hash.includes('?')) return null;
  const path = hash.replace(/^#/, '') || 'inbox';
  const parts = path.split('/');
  return parts.length === LIST_ROOT_ARITY[parts[0]] ? `#${path}/p1?nw=${nonce}` : null;
}
