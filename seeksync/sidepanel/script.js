document.addEventListener("DOMContentLoaded", function () {
  const inputNames = ["servername", "roomname", "username"];
  const connection = document.getElementById("connectionToggle");
  let chatMessages = [];

  /**
   * Utilities
   */

  // Format and display message on the chat panel
  function showMessage(message) {
    if (message.type === "chat") {
      const chatHistory = document.getElementById("chatHistory");
      const update = document.createElement("div");
      update.classList.add("message");
      if (message.sender === "user") {
        update.innerHTML = `
        <div class="message-text">
          <strong>${message.username}</strong>: ${message.text}
        </div>`;
      }
      if (message.sender === "system") {
        update.innerHTML = `
        <div class="message-text">
          <em>${message.text}</em>
        </div>`;
      }
      const date = new Date(message.ts * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      update.innerHTML += `<div class="message-ts">${date}</div>`;
      chatHistory.appendChild(update);
      // Scroll to the bottom
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }

  /**
   * UI Handlers
   */

  // Connection button handler
  document
    .getElementById("connectionToggle")
    .addEventListener("click", (event) => {
      // event.preventDefault();
      // Connect button handler
      const settings = {};
      inputNames.forEach((name) => {
        settings[name] = document.getElementById(name).value.trim();
      });
      chrome.storage.local.set(settings).then(() => {
        chrome.runtime.sendMessage({
          type: "control",
          action: "toggleconnect",
        });
      });
    });

  // Clear button submit handler
  document.getElementById("clearButton").addEventListener("click", (event) => {
    event.preventDefault();
    // Clear button handler
    chatMessages = [];
    document.getElementById("chatHistory").innerHTML = "";
    chrome.storage.session.set({ chatMessages: [] });
  });

  // Chat message handler
  document
    .getElementById("messageInput")
    .addEventListener("keypress", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const messageInput = document.getElementById("messageInput");
        const usernameInput = document.getElementById("username");
        if (messageInput.value.trim() !== "") {
          chrome.runtime.sendMessage({
            type: "chat",
            sender: "user",
            text: messageInput.value,
            username: usernameInput.value,
            ts: Date.now() / 1000,
          });
        }
        messageInput.value = "";
      }
    });

  // Settings toggle handler
  document
    .getElementById("settingsToggle")
    .addEventListener("click", (event) => {
      document.getElementById("settingsPanel").classList.toggle("hidden");
    });

  /**
   * One time actions
   */

  // Load saved values from storage and populate inputs on first load
  chrome.storage.local.get(inputNames).then((storage) => {
    inputNames.forEach((name) => {
      const input = document.getElementById(name);
      if (storage[name]) {
        input.value = storage[name];
      }
    });
  });

  // Restore messages from session storage on first load
  chrome.storage.session.get({ chatMessages: [] }).then((storage) => {
    chatMessages = storage.chatMessages;
    storage.chatMessages.forEach((message) => {
      showMessage(message);
    });
  });

  // Restore connection status from session storage on first load
  chrome.storage.session.get({ connected: false }).then((storage) => {
    connection.textContent = storage.connected;
  });

  // Ensure connection is established on first load
  chrome.runtime.sendMessage({
    type: "control",
    action: "ensureconnect",
  });

  /**
   * Chrome Listeners
   */

  // Listen for messages from the rest of the extension
  chrome.runtime.onMessage.addListener((message) => {
    console.log("sidepanel onmessage", message);
    showMessage(message);
    chatMessages.push(message);
    chrome.storage.session.set({ chatMessages: chatMessages });
  });

  // Listen for change in connected status
  chrome.storage.session.onChanged.addListener((changes) => {
    if (changes.connected) {
      connection.checked = changes.connected.newValue;
    }
  });
});
