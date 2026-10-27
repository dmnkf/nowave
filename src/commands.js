import {
  GMAIL_KEYS,
  assistRealKey,
  closePane,
  realKeyNotice,
  sendSequence,
  toggleRead,
  toggleSplitPane,
  triage,
} from './gmail.js';

// Command: { id, title, section, keys?, chips?, contexts?, native?, assisted?, gmailKeys?, inert?, run, assist? }
//   native: true, or the views where Gmail itself handles the command.
//   assisted: the views where Gmail handles the command once assist() has run during the key's keydown.
//   gmailKeys: the sequences Gmail itself binds to the command, from the Gmail key map. Where the command is
//   native or assisted, the key handler lets any of those keys through and only the palette calls run(); its other
//   keys call run(seq).
//   chips: the keys the palette shows, when not keys.
//   inert: { view: sequences } that nowave takes from Gmail in a view where the command does not run.

const DEFAULT_CONTEXTS = ['list', 'thread'];
const EVERYWHERE = ['list', 'thread', 'other', 'typing'];
const ACCOUNTS = [0, 1, 2, 3];

function gmailKey(id, title, section, keys, contexts, gmailSeqs = [keys[0]]) {
  const run = () => sendSequence(gmailSeqs[0]);
  return { id, title, section, keys, contexts, native: true, gmailKeys: gmailSeqs, run };
}

// id is also the action's entry in the Gmail key map.
function listAction(id, title, chords, after, app, gmail) {
  return {
    id,
    title,
    section: 'Triage',
    keys: chords.map((chord) => [chord]),
    native: ['thread'],
    gmailKeys: gmail[id],
    run: () => app.enqueue((live) => triage(gmail, id, after, live)),
  };
}

const sameSeq = (a, b) => a.join(' ') === b.join(' ');

// Gmail performs these only on a real key press. Its own keys pass through, in the list after assist() checks the
// cursor row; nowave's other keys and the palette say which key to press.
function realKeyAction(id, title, chords, app, gmail, isMac) {
  const own = chords.map((chord) => [chord]).filter((seq) => !gmail[id].some((g) => sameSeq(g, seq)));
  return {
    id,
    title,
    section: 'Triage',
    keys: [...gmail[id], ...own],
    chips: gmail[id],
    contexts: ['list', 'pane', 'thread'],
    native: ['pane', 'thread'],
    assisted: ['list'],
    gmailKeys: gmail[id],
    assist: () => assistRealKey(gmail, app.leaveRows),
    run: (pressed) => app.notice(realKeyNotice(id, gmail[id], pressed, isMac)),
  };
}

function goTo(id, title, keys, hash, app) {
  return { id, title, section: 'Navigate', keys, run: () => app.navigate(hash) };
}

// app: { navigate, switchAccount, cycleSplit, goToSplit, saveSplit, removeSplit, toggleCalm, toggleSkin, openPalette,
//        enqueue, selectEverything, leaveRows, notice, detectGmailKeys }
// gmail: the Gmail key map, GMAIL_KEYS with the user's overrides.
export function buildCommands(app, { splits, labels, gmail = GMAIL_KEYS, isMac = false }) {
  return [
    realKeyAction('archive', 'Mark done (archive)', ['e', 'd'], app, gmail, isMac),
    {
      id: 'select-everything',
      title: 'Select everything here',
      section: 'Triage',
      keys: [['shift+d']],
      contexts: ['list'],
      run: app.selectEverything,
    },
    realKeyAction('delete', 'Delete', ['#'], app, gmail, isMac),
    realKeyAction('spam', 'Report spam', ['!'], app, gmail, isMac),
    realKeyAction('mute', 'Mute', ['m'], app, gmail, isMac),
    listAction('snooze', 'Snooze', ['b'], 'menu', app, gmail),
    listAction('move', 'Move to…', ['v'], 'menu', app, gmail),
    listAction('label', 'Label…', [], 'menu', app, gmail),
    listAction('mark-read', 'Mark as read', ['shift+i'], 'keeps', app, gmail),
    listAction('mark-unread', 'Mark as unread', ['shift+u'], 'keeps', app, gmail),
    {
      id: 'toggle-read',
      title: 'Toggle read / unread',
      section: 'Triage',
      keys: [['u']],
      run: () => app.enqueue((live) => toggleRead(gmail, live)),
    },
    gmailKey('star', 'Star', 'Triage', [['s']]),
    gmailKey('select', 'Select conversation', 'Triage', [['x']], ['list'], gmail.select),
    {
      id: 'clear-selection',
      title: 'Clear selection',
      section: 'Triage',
      keys: [['escape']],
      contexts: ['everything'],
      run: () => sendSequence(gmail['deselect-all'][0]),
    },
    gmailKey('undo', 'Undo', 'Triage', [['z']], undefined, gmail.undo),

    gmailKey('next', 'Next conversation', 'Navigate', [['j']]),
    gmailKey('previous', 'Previous conversation', 'Navigate', [['k']]),
    {
      id: 'open',
      title: 'Open conversation',
      section: 'Navigate',
      keys: [['o'], ['enter'], ['l']],
      contexts: ['list'],
      native: true,
      gmailKeys: [...gmail.open, ['enter']],
      inert: { thread: [['l']] },
      run: () => sendSequence(gmail.open[0]),
    },
    {
      id: 'back',
      title: 'Back to list',
      section: 'Navigate',
      keys: [['escape'], ['h']],
      contexts: ['thread'],
      inert: { list: [['h']] },
      run: () => sendSequence(gmail.back[0]),
    },
    {
      id: 'close-pane',
      title: 'Close reading pane',
      section: 'Navigate',
      keys: [['escape'], ['h']],
      contexts: ['pane'],
      run: closePane,
    },
    gmailKey('search', 'Search mail', 'Navigate', [['/']]),
    gmailKey('go-inbox', 'Go to Inbox', 'Navigate', [['g', 'i']]),
    gmailKey('go-starred', 'Go to Starred', 'Navigate', [['g', 's']]),
    gmailKey('go-sent', 'Go to Sent', 'Navigate', [['g', 't']]),
    gmailKey('go-drafts', 'Go to Drafts', 'Navigate', [['g', 'd']]),
    goTo('go-snoozed', 'Go to Snoozed', [['g', 'h']], '#snoozed', app),
    goTo('go-done', 'Go to Done (All Mail)', [['g', 'e'], ['g', 'a']], '#all', app),
    goTo('go-spam', 'Go to Spam', [['g', '!']], '#spam', app),
    goTo('go-trash', 'Go to Trash', [['g', '#']], '#trash', app),
    ...labels.map((l) => goTo(`label:${l.hash}`, `Go to label: ${l.name}`, undefined, l.hash, app)),

    { id: 'next-split', title: 'Next split', section: 'Splits', keys: [['tab']], run: () => app.cycleSplit(1) },
    {
      id: 'previous-split',
      title: 'Previous split',
      section: 'Splits',
      keys: [['shift+tab']],
      run: () => app.cycleSplit(-1),
    },
    ...splits.map((s, i) => ({
      id: `split:${s.name}`,
      title: `Go to split: ${s.name}`,
      section: 'Splits',
      keys: i < 9 ? [['g', String(i + 1)]] : undefined,
      run: () => app.goToSplit(i),
    })),
    { id: 'save-split', title: 'Save search as split…', section: 'Splits', run: app.saveSplit },
    ...splits.map((s, i) => ({
      id: `remove-split:${s.name}`,
      title: `Remove split: ${s.name}`,
      section: 'Splits',
      run: () => app.removeSplit(i),
    })),

    gmailKey('compose', 'Compose', 'Compose', [['c']]),
    gmailKey('reply', 'Reply', 'Compose', [['r']], ['thread']),
    gmailKey('reply-all', 'Reply all', 'Compose', [['a']], ['thread']),
    gmailKey('forward', 'Forward', 'Compose', [['f']], ['thread']),

    {
      id: 'palette',
      title: 'Command palette',
      section: 'View',
      keys: [['mod+k']],
      contexts: EVERYWHERE,
      run: () => app.openPalette(false),
    },
    {
      id: 'shortcuts',
      title: 'Keyboard shortcuts',
      section: 'View',
      keys: [['?']],
      contexts: ['list', 'thread', 'other'],
      run: () => app.openPalette(true),
    },
    { id: 'calm', title: 'Toggle calm mode', section: 'View', run: app.toggleCalm },
    { id: 'skin', title: 'Toggle Shortwave look', section: 'View', run: app.toggleSkin },
    { id: 'split-view', title: 'Toggle split view', section: 'View', run: toggleSplitPane },

    ...ACCOUNTS.map((n) => ({
      id: `account:${n}`,
      title: `Switch to account ${n}`,
      section: 'Account',
      run: () => app.switchAccount(n),
    })),
    {
      id: 'shortcut-settings',
      title: 'Open Gmail keyboard shortcut setting',
      section: 'Account',
      run: () => app.navigate('#settings/general'),
    },
    { id: 'detect-gmail-keys', title: 'Detect Gmail keyboard shortcuts', section: 'Account', run: app.detectGmailKeys },
  ];
}

const isNativeIn = (command, context) =>
  command.native === true || (Array.isArray(command.native) && command.native.includes(context));

const isGmailKey = (command, seq) => command.gmailKeys?.some((keys) => sameSeq(keys, seq)) ?? false;

function modeIn(command, context, seq) {
  if (!isGmailKey(command, seq)) return 'run';
  if (isNativeIn(command, context)) return 'native';
  return command.assisted?.includes(context) ? 'assist' : 'run';
}

const SWALLOW = { id: 'swallow', run: () => {} };

// pane: the list with a conversation open in Gmail's split pane. everything: the list after Select everything here,
// while its rows stay checked. Every list key works in both, and their own bindings take precedence over the list's
// for the same sequence.
const REFINES = { pane: 'list', everything: 'list' };

// Flattens the registry into the bindings live in one context, for resolveKey.
export function bindingsFor(commands, context) {
  const live = commands
    .filter((c) => c.keys && (c.contexts ?? DEFAULT_CONTEXTS).includes(context))
    .flatMap((c) => c.keys.map((seq) => ({ seq, command: c, mode: modeIn(c, context, seq) })));
  const inert = commands.flatMap((c) =>
    (c.inert?.[context] ?? []).map((seq) => ({ seq, command: SWALLOW, mode: 'run' })),
  );
  const own = [...live, ...inert];
  if (!REFINES[context]) return own;
  const taken = new Set(own.map((b) => b.seq.join(' ')));
  return [...own, ...bindingsFor(commands, REFINES[context]).filter((b) => !taken.has(b.seq.join(' ')))];
}
