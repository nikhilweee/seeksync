/** Parse URL and extract query string */
function getURL(location) {
  const allowedParams = [];
  const queryParams = new URLSearchParams(location.search);
  // Avoid modifying queryParams while iterating
  for (const param of Array.from(queryParams.keys())) {
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
    const message = {
      type: "control",
      sender: "client",
      action: event.data.action,
      url: getURL(window.location),
      title: "this video",
      time: event.data.time,
    };
    // console.log("relay window to worker: ", message);
    chrome.runtime.sendMessage(message);
  }
});

/** Relay message from service worker and forward to injected script */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "control") {
    if (message.sender === "server") {
      // console.log("relay worker to window: ", message);
      window.postMessage(message);
    }
  }
});
