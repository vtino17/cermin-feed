chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    cerminVersion: chrome.runtime.getManifest().version,
    installedAt: new Date().toISOString(),
  });
});
