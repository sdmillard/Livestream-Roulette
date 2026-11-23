import { createYouTubePlayer } from './youtube-player.mjs';

const stage = document.querySelector('#playerArea');
const waiting = document.querySelector('#waiting');
const label = document.querySelector('#trialStatus');
let lastStatus;

function status(playback) {
  label.textContent = playback;
  if (lastStatus === playback) return;
  lastStatus = playback;
  void fetch('/api/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'barn-owl-youtube-trial', playback })
  }).then(response => {
    if (!response.ok) throw new Error('Could not report trial playback.');
  }).catch(() => {
    if (lastStatus === playback) lastStatus = undefined;
  });
}


const player = createYouTubePlayer({
  stage,
  onMounted(mounted) { waiting.hidden = mounted; },
  onStatus: status
});

async function poll() {
  let sample;
  try {
    const response = await fetch('/api/session', { cache: 'no-store', signal: AbortSignal.timeout(1500) });
    if (response.ok) sample = await response.json();
  } catch {}
  player.update('AorGWrn-vx8', sample);
  setTimeout(poll, 500);
}
void poll();
