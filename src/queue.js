// Runs actions one at a time, in the order they were queued. An action is bound to the scope that was
// current when it was queued: live() turns false once the scope changes, and the action checks it after
// every await. A null scope is never live.
export function createActionQueue(currentScope) {
  let tail = Promise.resolve();
  return (action) => {
    const scope = currentScope();
    const live = () => scope !== null && currentScope() === scope;
    const run = tail.then(() => (live() ? action(live) : undefined));
    tail = run.catch(() => {});
    return run;
  };
}
