import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCommands, bindingsFor } from '../src/commands.js';
import { gmailKeyMap } from '../src/gmail.js';
import { createKeySequence, resolveKey } from '../src/keys.js';
import { DEFAULT_SPLITS } from '../src/settings.js';
import { rankCommands } from '../src/rank.js';

function setup(gmail) {
  const calls = [];
  const record = (name) => (...args) => calls.push([name, ...args]);
  const app = {
    navigate: record('navigate'),
    switchAccount: record('switchAccount'),
    cycleSplit: record('cycleSplit'),
    goToSplit: record('goToSplit'),
    saveSplit: record('saveSplit'),
    removeSplit: record('removeSplit'),
    toggleCalm: record('toggleCalm'),
    toggleSkin: record('toggleSkin'),
    openPalette: record('openPalette'),
    selectEverything: record('selectEverything'),
    notice: record('notice'),
    enqueue: (action) => action(() => true),
  };
  const labels = [{ name: 'Receipts', hash: '#label/Receipts' }];
  return { calls, commands: buildCommands(app, { splits: DEFAULT_SPLITS, labels, gmail }) };
}

function press(commands, context, ...chords) {
  const bindings = bindingsFor(commands, context);
  let state = { chords: [], at: 0 };
  let result;
  for (const chord of chords) {
    result = resolveKey(bindings, state, chord, 1000);
    if (result.kind === 'pending') state = result.state;
  }
  return result.kind === 'run' ? { id: result.command.id, mode: result.mode } : { kind: result.kind };
}

test('Gmail\'s archive key reaches Gmail: assisted in the list, untouched in a thread or the split pane', () => {
  const { commands } = setup();
  assert.deepEqual(press(commands, 'list', 'e'), { id: 'archive', mode: 'assist' });
  assert.deepEqual(press(commands, 'thread', 'e'), { id: 'archive', mode: 'native' });
  assert.deepEqual(press(commands, 'pane', 'e'), { id: 'archive', mode: 'native' });
});

test('delete, spam and mute pass through like archive', () => {
  const { commands } = setup();
  for (const [key, id] of [['#', 'delete'], ['!', 'spam'], ['m', 'mute']]) {
    assert.deepEqual(press(commands, 'list', key), { id, mode: 'assist' });
    assert.deepEqual(press(commands, 'thread', key), { id, mode: 'native' });
    assert.deepEqual(press(commands, 'pane', key), { id, mode: 'native' });
  }
});

test('d, which is not Gmail\'s archive key, is taken from Gmail and says which key to press', () => {
  const { commands, calls } = setup();
  for (const context of ['list', 'pane', 'thread']) {
    assert.deepEqual(press(commands, context, 'd'), { id: 'archive', mode: 'run' });
  }
  commands.find((c) => c.id === 'archive').run(['d']);
  assert.deepEqual(calls, [
    [
      'notice',
      {
        title: 'Gmail only archives on its own shortcut. Press E.',
        lines: ["To use D too, add it as a second Archive shortcut in Gmail's keyboard shortcut settings."],
      },
    ],
  ]);
});

test('running a real-key-only action from the palette says which key to press and shows Gmail\'s keys', () => {
  const { commands, calls } = setup(gmailKeyMap({ archive: [['d'], ['e']], 'mark-read': [['shift+i']] }));
  const archive = commands.find((c) => c.id === 'archive');
  archive.run();
  commands.find((c) => c.id === 'spam').run();
  assert.deepEqual(calls, [
    ['notice', { title: 'Gmail only archives on its own shortcut. Press D or E.', lines: [] }],
    ['notice', { title: 'Gmail only reports spam on its own shortcut. Press !.', lines: [] }],
  ]);
  assert.deepEqual(archive.chips, [['d'], ['e']]);
});

test('a Gmail archive key outside nowave\'s own keys is bound, so the list assists it too', () => {
  const { commands, calls } = setup(gmailKeyMap({ archive: [['y'], ['shift+e']] }));
  assert.deepEqual(press(commands, 'list', 'y'), { id: 'archive', mode: 'assist' });
  assert.deepEqual(press(commands, 'list', 'shift+e'), { id: 'archive', mode: 'assist' });
  assert.deepEqual(press(commands, 'thread', 'y'), { id: 'archive', mode: 'native' });
  assert.deepEqual(press(commands, 'list', 'e'), { id: 'archive', mode: 'run' });
  commands.find((c) => c.id === 'archive').run(['e']);
  assert.deepEqual(calls, [
    [
      'notice',
      {
        title: 'Gmail only archives on its own shortcut. Press Y or Shift+E.',
        lines: ["To use E too, make it one of the Archive shortcuts in Gmail's keyboard shortcut settings."],
      },
    ],
  ]);
});

test('shift+d selects everything in a list and does nothing in a thread', () => {
  const { commands, calls } = setup();
  assert.deepEqual(press(commands, 'list', 'shift+d'), { id: 'select-everything', mode: 'run' });
  assert.deepEqual(press(commands, 'thread', 'shift+d'), { kind: 'none' });
  const command = commands.find((c) => c.id === 'select-everything');
  assert.equal(command.title, 'Select everything here');
  command.run();
  assert.deepEqual(calls, [['selectEverything']]);
});

test('with everything selected, Esc clears the selection and Gmail\'s archive key reaches Gmail', async () => {
  const { commands } = setup(gmailKeyMap({ archive: [['d'], ['e']] }));
  assert.deepEqual(press(commands, 'everything', 'escape'), { id: 'clear-selection', mode: 'run' });
  assert.deepEqual(press(commands, 'everything', 'd'), { id: 'archive', mode: 'assist' });
  assert.deepEqual(press(commands, 'everything', 'j'), { id: 'next', mode: 'native' });
  assert.deepEqual(press(commands, 'list', 'escape'), { kind: 'none' });
  const clear = commands.find((c) => c.id === 'clear-selection');
  assert.deepEqual(await sentInThread(() => clear.run()), ['*', 'n']);
});

test('b snoozes the cursor row in the list and passes through to Gmail in a thread', () => {
  const { commands } = setup();
  assert.deepEqual(press(commands, 'list', 'b'), { id: 'snooze', mode: 'run' });
  assert.deepEqual(press(commands, 'thread', 'b'), { id: 'snooze', mode: 'native' });
});

test('l opens the cursor conversation for nowave while o and Enter stay with Gmail, and l does nothing in a thread', () => {
  const { commands } = setup();
  assert.deepEqual(press(commands, 'list', 'l'), { id: 'open', mode: 'run' });
  assert.deepEqual(press(commands, 'list', 'o'), { id: 'open', mode: 'native' });
  assert.deepEqual(press(commands, 'list', 'enter'), { id: 'open', mode: 'native' });
  assert.deepEqual(press(commands, 'thread', 'l'), { id: 'swallow', mode: 'run' });
});

test('h goes back to the list from a thread and does nothing in the list', () => {
  const { commands } = setup();
  assert.deepEqual(press(commands, 'thread', 'h'), { id: 'back', mode: 'run' });
  assert.deepEqual(press(commands, 'list', 'h'), { id: 'swallow', mode: 'run' });
  assert.deepEqual(press(commands, 'typing', 'h'), { kind: 'none' });
  assert.deepEqual(press(commands, 'other', 'h'), { kind: 'none' });
});

test('with a conversation open in the split pane, h and Esc close the pane for nowave', () => {
  const { commands } = setup();
  assert.deepEqual(press(commands, 'pane', 'h'), { id: 'close-pane', mode: 'run' });
  assert.deepEqual(press(commands, 'pane', 'escape'), { id: 'close-pane', mode: 'run' });
  assert.deepEqual(press(commands, 'list', 'escape'), { kind: 'none' });
});

test('with a conversation open in the split pane, every other key works as in the list', () => {
  const { commands } = setup();
  assert.deepEqual(press(commands, 'pane', 'shift+i'), { id: 'mark-read', mode: 'run' });
  assert.deepEqual(press(commands, 'pane', 'l'), { id: 'open', mode: 'run' });
  assert.deepEqual(press(commands, 'pane', 'enter'), { id: 'open', mode: 'native' });
  assert.deepEqual(press(commands, 'pane', 'j'), { id: 'next', mode: 'native' });
  assert.deepEqual(press(commands, 'pane', 'g', 'h'), { id: 'go-snoozed', mode: 'run' });
  const key = (b) => `${b.seq.join(' ')} ${b.command.id} ${b.mode}`;
  const shared = (b) => !b.command.assisted && b.command.id !== 'close-pane';
  const listKeys = bindingsFor(commands, 'list').filter((b) => shared(b) && !['h', 'escape'].includes(b.seq.join(' ')));
  const paneKeys = bindingsFor(commands, 'pane').filter(shared);
  assert.deepEqual(paneKeys.map(key).sort(), listKeys.map(key).sort());
});

test('label has no key and stays in the palette', () => {
  const { commands } = setup();
  for (const context of ['list', 'thread', 'other', 'typing']) {
    assert.deepEqual(bindingsFor(commands, context).filter((b) => b.command.id === 'label'), []);
  }
  assert.equal(rankCommands(commands, 'label', [])[0].commands[0].id, 'label');
});

test('g passes through so Gmail keeps its own g sequences', () => {
  const { commands } = setup();
  const result = resolveKey(bindingsFor(commands, 'list'), { chords: [], at: 0 }, 'g', 1000);
  assert.equal(result.kind, 'pending');
  assert.equal(result.mode, 'native');
  assert.deepEqual(press(commands, 'list', 'g', 'i'), { id: 'go-inbox', mode: 'native' });
  assert.deepEqual(press(commands, 'list', 'g', 'h'), { id: 'go-snoozed', mode: 'run' });
  assert.deepEqual(press(commands, 'thread', 'g', '!'), { id: 'go-spam', mode: 'run' });
});

test('g then a digit goes to that split', () => {
  const { commands, calls } = setup();
  assert.deepEqual(press(commands, 'list', 'g', '2'), { id: 'split:Updates', mode: 'run' });
  commands.find((c) => c.id === 'split:Updates').run();
  assert.deepEqual(calls, [['goToSplit', 1]]);
});

test('go-to commands navigate to the Gmail hash', () => {
  const { commands, calls } = setup();
  for (const id of ['go-snoozed', 'go-done', 'label:#label/Receipts']) commands.find((c) => c.id === id).run();
  assert.deepEqual(calls, [
    ['navigate', '#snoozed'],
    ['navigate', '#all'],
    ['navigate', '#label/Receipts'],
  ]);
});

test('while typing only the palette key is live', () => {
  const { commands } = setup();
  assert.deepEqual(press(commands, 'typing', 'e'), { kind: 'none' });
  assert.deepEqual(press(commands, 'typing', 'mod+k'), { id: 'palette', mode: 'run' });
});

test('Esc goes back to the list only from a thread', () => {
  const { commands } = setup();
  assert.deepEqual(press(commands, 'thread', 'escape'), { id: 'back', mode: 'run' });
  assert.deepEqual(press(commands, 'list', 'escape'), { kind: 'none' });
});

test('on settings pages ? opens the cheat sheet and Tab stays with the browser', () => {
  const { commands, calls } = setup();
  assert.deepEqual(press(commands, 'other', '?'), { id: 'shortcuts', mode: 'run' });
  assert.deepEqual(press(commands, 'other', 'tab'), { kind: 'none' });
  commands.find((c) => c.id === 'shortcuts').run();
  assert.deepEqual(calls, [['openPalette', true]]);
});

test('no key sequence is bound twice or shadowed by a shorter one in any context', () => {
  const { commands } = setup();
  for (const context of ['list', 'pane', 'everything', 'thread', 'other', 'typing']) {
    const seqs = bindingsFor(commands, context).map((b) => b.seq);
    for (const a of seqs) {
      for (const b of seqs) {
        if (a === b) continue;
        const shadowed = a.length <= b.length && a.every((chord, i) => b[i] === chord);
        assert.ok(!shadowed, `${context}: ${a.join(' ')} collides with ${b.join(' ')}`);
      }
    }
  }
});

test('the cheat sheet lists every command exactly once, starting with triage', () => {
  const { commands } = setup();
  const groups = rankCommands(commands, '', []);
  const shown = groups.flatMap((g) => g.commands.map((c) => c.id));
  assert.equal(shown.length, commands.length);
  assert.equal(new Set(shown).size, commands.length);
  assert.deepEqual(groups.map((g) => g.title), ['Triage', 'Navigate', 'Splits', 'Compose', 'View', 'Account']);
  assert.deepEqual(shown.slice(0, 3), ['archive', 'select-everything', 'delete']);
});

test('a g pressed before navigating or opening the palette does not turn the next e into Go to Done', () => {
  const { commands } = setup();
  const bindings = bindingsFor(commands, 'list');
  const key = (k) => ({ key: k, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false });
  const sequence = createKeySequence(true);
  sequence.press(bindings, key('g'), 1000);
  assert.equal(sequence.press(bindings, key('e'), 1300).command.id, 'go-done');
  sequence.press(bindings, key('g'), 2000);
  sequence.reset();
  assert.equal(sequence.press(bindings, key('e'), 2300).command.id, 'archive');
});

test('labels add palette commands but no key bindings, so the key handler can skip them', () => {
  const { commands } = setup();
  const withoutLabels = buildCommands({}, { splits: DEFAULT_SPLITS, labels: [] });
  const keyed = (list) => bindingsFor(list, 'list').map((b) => `${b.seq.join(' ')} ${b.command.id}`);
  assert.deepEqual(keyed(commands), keyed(withoutLabels));
  assert.equal(commands.length - withoutLabels.length, 1);
});

test('the shift or option keydown that types # keeps g then # as Go to Trash', () => {
  const { commands } = setup();
  const bindings = bindingsFor(commands, 'list');
  const key = (k, mods = {}) => ({ key: k, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...mods });
  for (const mod of [{ shiftKey: true }, { altKey: true }]) {
    const sequence = createKeySequence(true);
    const modifierKey = mod.shiftKey ? 'Shift' : 'Alt';
    const results = [
      sequence.press(bindings, key('g'), 1000),
      sequence.press(bindings, key(modifierKey, mod), 1100),
      sequence.press(bindings, key('#', mod), 1200),
    ];
    assert.deepEqual(results.map((r) => r.kind), ['pending', 'none', 'run']);
    assert.equal(results[2].command.id, 'go-trash');
  }
});

// Archive on d, as one user's custom Gmail shortcuts have it.
const CUSTOM = gmailKeyMap({ archive: [['d']] });

// Records the keys nowave sends into Gmail while a thread is open, from the keydown events it dispatches.
async function sentInThread(run) {
  const sent = [];
  const target = new EventTarget();
  target.addEventListener('keydown', (e) => sent.push(e.key));
  const saved = { location: globalThis.location, document: globalThis.document, KeyboardEvent: globalThis.KeyboardEvent };
  Object.assign(globalThis, {
    location: { hash: '#inbox/ThreadIdForTests0000000000000001' },
    document: { activeElement: target, body: target },
    KeyboardEvent: class extends Event {
      constructor(type, init) {
        super(type, init);
        this.key = init.key;
      }
    },
  });
  try {
    await run();
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
  }
  return sent;
}

test('with Gmail archive on d, d reaches Gmail and e is taken from it', () => {
  const { commands } = setup(CUSTOM);
  assert.deepEqual(press(commands, 'thread', 'd'), { id: 'archive', mode: 'native' });
  assert.deepEqual(press(commands, 'thread', 'e'), { id: 'archive', mode: 'run' });
  assert.deepEqual(press(commands, 'list', 'd'), { id: 'archive', mode: 'assist' });
  assert.deepEqual(press(commands, 'list', 'e'), { id: 'archive', mode: 'run' });
});

test('a key that is not Gmail\'s archive key sends no key, because Gmail ignores a synthetic archive', async () => {
  const { commands, calls } = setup(CUSTOM);
  const result = resolveKey(bindingsFor(commands, 'thread'), { chords: [], at: 0 }, 'e', 1000);
  assert.deepEqual(await sentInThread(() => result.command.run(result.seq)), []);
  assert.equal(calls[0][1].title, 'Gmail only archives on its own shortcut. Press D.');
});

test('a key nowave passes through for Gmail becomes nowave\'s when Gmail moves the action elsewhere', async () => {
  const { commands } = setup(
    gmailKeyMap({ select: [['shift+x']], undo: [['shift+z']], back: [['shift+b']], 'mark-unread': [['shift+n']] }),
  );
  assert.deepEqual(press(commands, 'list', 'x'), { id: 'select', mode: 'run' });
  assert.deepEqual(press(commands, 'thread', 'z'), { id: 'undo', mode: 'run' });
  assert.deepEqual(press(commands, 'thread', 'shift+u'), { id: 'mark-unread', mode: 'run' });
  const run = (context, chord) => resolveKey(bindingsFor(commands, context), { chords: [], at: 0 }, chord, 1000).command.run();
  assert.deepEqual(
    await sentInThread(async () => {
      await run('thread', 'z');
      await run('thread', 'h');
      await run('thread', 'u');
    }),
    ['Z', 'B', 'N'],
  );
});

test('with Gmail archive on both d and e, both reach Gmail', () => {
  const { commands } = setup(gmailKeyMap({ archive: [['d'], ['e']] }));
  for (const key of ['d', 'e']) {
    assert.deepEqual(press(commands, 'thread', key), { id: 'archive', mode: 'native' });
    assert.deepEqual(press(commands, 'list', key), { id: 'archive', mode: 'assist' });
  }
});

test('a command sends the first of Gmail\'s keys for its action', async () => {
  const { commands } = setup(gmailKeyMap({ back: [['shift+b'], ['u']] }));
  const back = resolveKey(bindingsFor(commands, 'thread'), { chords: [], at: 0 }, 'h', 1000).command;
  assert.deepEqual(await sentInThread(() => back.run()), ['B']);
});
