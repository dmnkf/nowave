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

const VIEWS = {
  inbox: { name: 'Inbox', icon: 'inbox' },
  starred: { name: 'Starred', icon: 'star' },
  snoozed: { name: 'Snoozed', icon: 'clock' },
  sent: { name: 'Sent', icon: 'send' },
  drafts: { name: 'Drafts', icon: 'draft' },
  all: { name: 'Done', icon: 'done' },
  spam: { name: 'Spam', icon: 'spam' },
  trash: { name: 'Trash', icon: 'trash' },
  imp: { name: 'Important', icon: 'inbox' },
  scheduled: { name: 'Scheduled', icon: 'clock' },
  search: { name: 'Search', icon: 'search' },
  'advanced-search': { name: 'Search', icon: 'search' },
  settings: { name: 'Settings', icon: 'settings' },
};

// The name and icon of the folder switcher: { name, icon }. A search that is a split shows the split's name.
export function viewOf(hash, splits) {
  const root = hash.replace(/^#/, '').split(/[/?]/)[0] || 'inbox';
  if (root === 'search') {
    const split = splits[activeSplitIndex(splits, hash)];
    if (split) return { name: split.name, icon: 'inbox' };
  }
  if (root === 'label') return { name: labelName(hash) ?? 'Label', icon: 'label' };
  if (root === 'category') {
    const category = decodeQuery(hash.split(/[/?]/)[1] ?? '');
    return { name: category.charAt(0).toUpperCase() + category.slice(1), icon: 'inbox' };
  }
  return VIEWS[root] ?? VIEWS.inbox;
}
