import { GMAIL_KEYS, gmailAlternatives } from './gmail.js';

export const STORAGE_KEY = 'nowave';

const RECENT_LIMIT = 8;

export const DEFAULT_SPLITS = [
  { name: 'Inbox', query: 'in:inbox' },
  { name: 'Updates', query: 'in:inbox category:updates' },
  { name: 'Promotions', query: 'in:inbox category:promotions' },
  { name: 'Social', query: 'in:inbox category:social' },
];

const isText = (v) => typeof v === 'string' && v.trim() !== '';

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

const parseGmailKeys = (raw) =>
  isObject(raw)
    ? Object.fromEntries(
        Object.entries(raw)
          .filter(([action]) => Object.hasOwn(GMAIL_KEYS, action))
          .map(([action, value]) => [action, gmailAlternatives(value)])
          .filter(([, alternatives]) => alternatives.length > 0),
      )
    : {};

// Settings: { splits: Split[], calm: boolean, skin: boolean, navCollapsedBySkin: boolean, recent: string[],
//             gmailKeys: { [action in GMAIL_KEYS]?: string[][] } }
export function parseSettings(raw) {
  let data = null;
  try {
    data = JSON.parse(raw ?? 'null');
  } catch {
    data = null;
  }
  const splits = Array.isArray(data?.splits)
    ? data.splits.filter((s) => isText(s?.name) && isText(s?.query)).map((s) => ({ name: s.name, query: s.query }))
    : DEFAULT_SPLITS;
  return {
    splits,
    calm: typeof data?.calm === 'boolean' ? data.calm : true,
    skin: typeof data?.skin === 'boolean' ? data.skin : true,
    navCollapsedBySkin: data?.navCollapsedBySkin === true,
    recent: Array.isArray(data?.recent) ? data.recent.filter(isText).slice(0, RECENT_LIMIT) : [],
    gmailKeys: parseGmailKeys(data?.gmailKeys),
  };
}

export function addSplit(settings, split) {
  return { ...settings, splits: [...settings.splits, { name: split.name.trim(), query: split.query.trim() }] };
}

export function removeSplit(settings, index) {
  return { ...settings, splits: settings.splits.filter((_, i) => i !== index) };
}

export function recordRecent(settings, id) {
  return { ...settings, recent: [id, ...settings.recent.filter((r) => r !== id)].slice(0, RECENT_LIMIT) };
}
