/** Configure action button to open side panel */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
chrome.action.setBadgeBackgroundColor({ color: "#14335D" });

let ws = null;
let chatMessages = [];
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

/** Establish a new websocket connection */
function handleConnect() {
  chrome.storage.local.get("servername").then((storage) => {
    const url = `ws://${storage.servername}`;
    ws = new WebSocket(url);
    ws.onopen = (event) => {
      websocketSend({ type: "control", action: "connect" });
      chrome.runtime.sendMessage({
        type: "chat",
        sender: "system",
        text: `Connected to ${storage.servername}`,
        ts: Date.now() / 1000,
      });
      keepAlive();
      chrome.action.setIcon({ path: "images/icon-blue-128.png" });
      chrome.storage.session.set({ connected: true });
    };
    ws.onerror = (event) => {
      chrome.runtime.sendMessage({
        type: "chat",
        sender: "system",
        text: `Error connecting to ${url}`,
        ts: Date.now() / 1000,
      });
    };
    ws.onclose = (event) => {
      chrome.runtime.sendMessage({
        type: "chat",
        sender: "system",
        text: `Disconnected from ${storage.servername}`,
        ts: Date.now() / 1000,
      });
      chrome.action.setIcon({ path: "images/icon-gray-128.png" });
      chrome.storage.session.set({ connected: false });
      ws = null;
    };
    // Need to refine this further
    ws.onmessage = (event) => {
      websocketReceive(event);
    };
  });
}

/**  Update badge count for user messages */
function updateBadge(message) {
  if (message.sender === "user") {
    chrome.storage.local.get(["username"]).then((storage) => {
      if (message.username === storage.username) {
        // If the message is from the current user, clear the badge
        chrome.action.setBadgeText({ text: "" });
      } else {
        // If the message is from another user, increment the count
        chrome.action.getBadgeText({}).then((text) => {
          if (text === "") {
            chrome.action.setBadgeText({ text: "1" });
          } else {
            let count = parseInt(text) + 1;
            count = count > 10 ? "10+" : count.toString();
            chrome.action.setBadgeText({ text: count });
          }
        });
      }
    });
  }
}

function websocketReceive(event) {
  const message = JSON.parse(event.data);
  console.log("websocket receive", message);
  if (message.type === "control") {
    // Route control messages to content script
    chrome.tabs
      .query({ active: true, lastFocusedWindow: true })
      .then(([tab]) => {
        chrome.tabs.sendMessage(tab.id, message);
      });
  } else {
    // Route chat messages to chat panel
    chatMessages.push(message);
    chrome.storage.session.set({ chatMessages: chatMessages });
    chrome.runtime.sendMessage(message);
    updateBadge(message);
  }
}

function websocketSend(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    // Prepare and send message if websocket is open
    chrome.storage.local.get(["roomname", "username"]).then((storage) => {
      message.roomname = storage.roomname || "default";
      message.username = storage.username || "default";
      console.log("websocket send", message);
      ws.send(JSON.stringify(message));
    });
  } else {
    // Show error message if websocket is not open
    chrome.runtime.sendMessage({
      type: "chat",
      sender: "system",
      text: "Error: Not connected to server",
      ts: Date.now() / 1000,
    });
  }
}

chrome.runtime.onMessage.addListener((message) => {
  console.log("service worker onmessage", message);
  if (message.type === "control") {
    if (message.action === "toggleconnect") {
      // received when user clicks connection toggle button
      if (ws) {
        ws.close();
      } else {
        handleConnect();
      }
    }
    if (message.action === "ensureconnect") {
      // received when user opens side panel
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        handleConnect();
      }
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
