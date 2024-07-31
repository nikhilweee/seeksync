/** Parse URL and extract query string */
function getURL(location) {
  const allowedParams = ["trackId"];
  const queryParams = new URLSearchParams(location.search);
  for (const param of queryParams.keys()) {
    if (!allowedParams.includes(param)) {
      queryParams.delete(param);
    }
  }
  const newUrl = new URL(location.href);
  newUrl.search = queryParams.toString();
  return newUrl;
}

/** Relay message from injected script and forward to service worker */
window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return; // Only accept messages from the same window
  }

  if (event?.data?.sender === "client") {
    console.log("relay window to worker: ", event.data);
    chrome.runtime.sendMessage({
      type: "control",
      sender: "client",
      action: event.data.action,
      url: getURL(window.location),
      time: event.data.time,
    });
  }
});

/** Relay message from service worker and forward to injected script */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "control") {
    if (message.sender === "server") {
      console.log("relay worker to window:", message);
      window.postMessage(message);
    }
  }
});
