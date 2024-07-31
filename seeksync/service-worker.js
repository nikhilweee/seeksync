/** Configure action button to open side panel */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

let ws = null;
let keepAliveIntervalId = null;

function keepAlive() {
  // Clear existing interval if any
  if (keepAliveIntervalId) {
    clearInterval(keepAliveIntervalId);
  }
  keepAliveIntervalId = setInterval(
    () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send("keepalive");
      } else {
        clearInterval(keepAliveIntervalId);
      }
    },
    // Set the interval to 20 seconds.
    20 * 1000
  );
}

function handleConnect(message) {
  // Close existing connection
  if (ws) {
    ws.close();
    ws = null;
  }
  // Open a new connection
  chrome.storage.local.get("servername").then((storage) => {
    const url = `ws://${storage.servername}`;
    ws = new WebSocket(url);
    ws.onopen = (event) => {
      websocketSend({ type: "control", action: "connect" });
      chrome.runtime.sendMessage({
        type: "chat",
        sender: "system",
        text: `Connected to ${url}`,
      });
      keepAlive();
    };
    ws.onerror = (event) => {
      chrome.runtime.sendMessage({
        type: "chat",
        sender: "system",
        text: `Error connecting to ${url}`,
      });
    };
    ws.onclose = (event) => {
      chrome.runtime.sendMessage({
        type: "chat",
        sender: "system",
        text: `Disconnected from ${url}`,
      });
    };
    // Need to refine this further
    ws.onmessage = (event) => {
      websocketReceive(event);
    };
  });
}

function websocketReceive(event) {
  const message = JSON.parse(event.data);
  console.log("websocket receive", message);
  if (message.type === "control") {
    chrome.tabs
      .query({ active: true, lastFocusedWindow: true })
      .then(([tab]) => {
        chrome.tabs.sendMessage(tab.id, message);
      });
  } else {
    chrome.runtime.sendMessage(message);
  }
}

function websocketSend(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    chrome.storage.local.get(["roomname", "username"]).then((storage) => {
      message.roomname = storage.roomname || "default";
      message.username = storage.username || "default";
      console.log("websocket send", message);
      ws.send(JSON.stringify(message));
    });
  } else {
    chrome.runtime.sendMessage({
      type: "chat",
      sender: "system",
      text: "Error: Not connected to server",
    });
  }
}

chrome.runtime.onMessage.addListener((message) => {
  console.log("service worker onmessage", message);
  if (message.type === "control") {
    if (message.action === "connect") {
      // received when user clicks connect button
      handleConnect(message);
    }
    if (message.action === "play" || message.action === "pause") {
      // received when user plays or pauses video
      if (message.sender === "client") {
        websocketSend(message);
      }
    }
  }
  if (message.type === "chat") {
    // received when user sends chat message
    websocketSend(message);
  }
});
