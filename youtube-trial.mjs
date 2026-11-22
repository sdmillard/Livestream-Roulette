const VIDEO_ID = 'AorGWrn-vx8';
const stage = document.querySelector('#playerArea');
const waiting = document.querySelector('#waiting');
const label = document.querySelector('#trialStatus');
let player;
let frame;
let sample;
let api;
let lastStatus;
let failed = false;

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

function playerApi() {
  if (!api) {
    api = new Promise((resolve, reject) => {
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = reject;
      document.head.append(script);
    });
  }
  return api;
}

function removePlayer() {
  const previous = player;
  frame = undefined;
  player = undefined;
  previous?.destroy();
  stage.replaceChildren();
  waiting.hidden = false;
}

function unavailableReason() {
  if (document.hidden) return 'Paused · Wallpaper is hidden';
  if (!sample?.playerArea || typeof sample.controlsOpen !== 'boolean') return 'Waiting for the Windows companion.';
  if (sample.controlsOpen) return 'Paused · Livestream Roulette controls are open';
  if (!(sample.playerVisibility > 0.5)) return 'Paused · More than half of the player must be visible';
  for (const key of ['left', 'top', 'width', 'height']) {
    stage.style[key] = `${sample.playerArea[key] * 100}%`;
  }
  if (stage.clientWidth < 200 || stage.clientHeight < 200) return 'Waiting for a larger unobstructed player area.';
  return '';
}

function reconcile() {
  const reason = unavailableReason();
  if (reason) {
    failed = false;
    if (frame) removePlayer();
    status(reason);
    return;
  }
  if (frame || failed) return;

  const embed = document.createElement('iframe');
  embed.title = 'Barn Owl Live on YouTube';
  embed.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
  embed.allowFullscreen = true;
  embed.referrerPolicy = 'strict-origin-when-cross-origin';
  const url = new URL(`https://www.youtube.com/embed/${VIDEO_ID}`);
  url.search = new URLSearchParams({ enablejsapi: '1', origin: location.origin, playsinline: '1' });
  embed.src = url;
  frame = embed;
  stage.append(embed);
  waiting.hidden = true;
  status('Connecting to the official YouTube player');

  function showError(message) {
    if (frame !== embed) return;
    removePlayer();
    failed = true;
    status(message);
  }

  playerApi().then(YT => {
    if (frame !== embed) return;
    player = new YT.Player(embed, {
      events: {
        onReady(event) {
          if (frame !== embed) return;
          if (unavailableReason()) {
            reconcile();
            return;
          }
          event.target.mute();
          event.target.playVideo();
        },
        onStateChange(event) {
          if (frame !== embed) return;
          if (event.data === YT.PlayerState.PLAYING) status('Playing · Barn Owl Live on YouTube');
          if (event.data === YT.PlayerState.BUFFERING) status('Buffering · YouTube');
          if (event.data === YT.PlayerState.PAUSED) status('Paused · YouTube player');
          if (event.data === YT.PlayerState.ENDED) showError('The YouTube broadcast ended.');
        },
        onAutoplayBlocked() {
          if (frame === embed) status('YouTube autoplay was blocked.');
        },
        onError(event) {
          showError('YouTube player error ' + event.data);
        }
      }
    });
  }).catch(() => showError('The YouTube player API could not load.'));
}

async function poll() {
  try {
    const response = await fetch('/api/session', { cache: 'no-store', signal: AbortSignal.timeout(1500) });
    sample = response.ok ? await response.json() : undefined;
  } catch {
    sample = undefined;
  }
  reconcile();
  setTimeout(poll, 500);
}

document.addEventListener('visibilitychange', reconcile);
window.addEventListener('resize', reconcile);
void poll();
