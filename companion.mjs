async function request(path, data) {
  const options = data === undefined ? {} : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
  const response = await fetch('/api/' + path, { ...options, cache: 'no-store' });
  if (!response.ok) throw new Error('Companion request failed: ' + response.status);
  return response.json();
}

export function connectCompanion(mode, handlers) {
  let epoch;
  let sequence = 0;
  let writes = Promise.resolve();
  let pending = 0;
  let revision = 0;

  async function poll() {
    try {
      const previousRevision = revision;
      const session = await request('session');
      if (pending === 0 && previousRevision === revision) handlers.settings(session.settings);
      if (mode === 'controls') {
        handlers.status(session.status);
      } else {
        const newest = session.commands.at(-1)?.sequence ?? 0;
        const newSession = epoch !== session.epoch;
        if (epoch === session.epoch) {
          for (const command of session.commands) {
            if (command.sequence > sequence) handlers.command(command);
          }
        }
        epoch = session.epoch;
        sequence = newest;
        handlers.connected(newSession);
      }
      handlers.error('');
    } catch {
      handlers.error('Wallpaper companion is unavailable.');
    } finally {
      setTimeout(poll, 750);
    }
  }
  void poll();

  return {
    save(settings) {
      const snapshot = structuredClone(settings);
      pending += 1;
      revision += 1;
      writes = writes.then(() => request('settings', snapshot))
        .catch(() => handlers.error('Could not save wallpaper settings.'))
        .finally(() => { pending -= 1; });
    },
    command(action, id) {
      writes = writes.then(() => request('command', { action, id }))
        .catch(() => handlers.error('Could not send wallpaper command.'));
    },
    status(status) {
      return request('status', status);
    }
  };
}

// The desktop host clips its window to these rectangles, so blank space
// outside the gear and panels belongs to the desktop.
export function reportControlBounds() {
  const bridge = window.chrome?.webview;
  if (!bridge) return;
  const controls = [...document.querySelectorAll('#menu, #menuActions, .submenu')];
  let frame;
  function report() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rects = controls.filter(element => element.getClientRects().length)
        .map(element => {
          const { left, top, width, height } = element.getBoundingClientRect();
          return { left, top, width, height };
        });
      bridge.postMessage({ width: innerWidth, height: innerHeight, rects });
    });
  }
  const observer = new ResizeObserver(report);
  controls.forEach(control => observer.observe(control));
  addEventListener('resize', report);
  report();
}
