const captureButton = document.querySelector('#capture');
const downloadButton = document.querySelector('#download');
const clearButton = document.querySelector('#clear');
const result = document.querySelector('#result');
const count = document.querySelector('#count');
const status = document.querySelector('#status');

const platformFromHost = (host) => {
  if (host.includes('twitter.com') || host.includes('x.com')) return 'x';
  if (host.includes('linkedin.com')) return 'linkedin';
  if (host.includes('reddit.com')) return 'reddit';
  if (host.includes('youtube.com')) return 'youtube';
  if (host.includes('instagram.com')) return 'instagram';
  return 'other';
};

function extractVisibleFeed() {
  const redact = (value) =>
    value
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
      .replace(/(?<!\d)(?:\+62|62|0)8[1-9][\d\s().-]{6,14}\d(?!\d)/g, '[PHONE]')
      .replace(/\b\d{13,16}\b/g, '[LONG_NUMBER]');
  const selectors = [
    'article',
    '[role="article"]',
    '[data-testid="tweet"]',
    'ytd-rich-item-renderer',
    '.feed-shared-update-v2',
  ];
  const candidates = [
    ...new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)])),
  ];
  const visible = candidates.filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight * 1.5 && rect.width > 180;
  });

  return visible
    .slice(0, 80)
    .map((element, index) => {
      const sourceElement = element.querySelector(
        '[data-testid="User-Name"], h3, h4, a[href*="/user/"], a[href*="/channel/"], .update-components-actor__name',
      );
      const text = redact((element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 5000));
      return {
        id: `capture-${Date.now()}-${index}`,
        source: redact(
          (sourceElement?.textContent || 'Tidak diketahui')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120),
        ),
        text,
        capturedAt: new Date().toISOString(),
        host: location.hostname,
      };
    })
    .filter((item) => item.text.length >= 24);
}

async function refresh() {
  const { latestSnapshot } = await chrome.storage.local.get('latestSnapshot');
  if (latestSnapshot?.items?.length) {
    result.hidden = false;
    count.textContent = `${latestSnapshot.items.length} posting`;
  } else {
    result.hidden = true;
  }
}

captureButton.addEventListener('click', async () => {
  captureButton.disabled = true;
  status.textContent = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) throw new Error('Tab aktif tidak dapat dibaca.');
    const [{ result: items }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractVisibleFeed,
    });
    const platform = platformFromHost(new URL(tab.url).hostname);
    const snapshot = {
      capturedAt: new Date().toISOString(),
      page: new URL(tab.url).hostname,
      items: (items || []).map((item) => ({ ...item, platform })),
    };
    await chrome.storage.local.set({ latestSnapshot: snapshot });
    status.textContent = snapshot.items.length
      ? 'Snapshot siap.'
      : 'Belum menemukan posting yang terlihat pada halaman ini.';
    await refresh();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Gagal mengambil snapshot.';
  } finally {
    captureButton.disabled = false;
  }
});

downloadButton.addEventListener('click', async () => {
  const { latestSnapshot } = await chrome.storage.local.get('latestSnapshot');
  if (!latestSnapshot) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(latestSnapshot.items, null, 2)], { type: 'application/json' }),
  );
  await chrome.downloads.download({
    url,
    filename: `cermin-feed-${Date.now()}.json`,
    saveAs: true,
  });
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

clearButton.addEventListener('click', async () => {
  await chrome.storage.local.remove('latestSnapshot');
  status.textContent = 'Data extension dihapus.';
  await refresh();
});

void refresh();
