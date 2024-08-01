document.addEventListener("DOMContentLoaded", function () {
  const inputNames = ["servername", "roomname", "username"];
  let chatMessages = [];

  // Load saved values from storage and populate inputs
  chrome.storage.local.get(inputNames).then((storage) => {
    inputNames.forEach((name) => {
      const input = document.getElementById(name);
      if (storage[name]) {
        input.value = storage[name];
      }
    });
  });

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

  // Listen for messages from the rest of the extension
  chrome.runtime.onMessage.addListener((message) => {
    console.log("sidepanel onmessage", message);
    showMessage(message);
    chatMessages.push(message);
    chrome.storage.session.set({ chatMessages: chatMessages });
  });

  // Form submit handler
  document
    .getElementById("settingsForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      // Connect button handler
      if (event.submitter.name === "connect") {
        const settings = {};
        inputNames.forEach((name) => {
          settings[name] = document.getElementById(name).value.trim();
        });
        chrome.storage.local.set(settings).then(() => {
          chrome.runtime.sendMessage({
            type: "control",
            action: "connect",
          });
        });
      }
      // Clear button handler
      if (event.submitter.name === "clear") {
        chatMessages = [];
        document.getElementById("chatHistory").innerHTML = "";
        chrome.storage.session.set({ chatMessages: [] });
      }
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

  // Restore messages from session storage on first load
  chrome.storage.session.get({ chatMessages: [] }).then((storage) => {
    chatMessages = storage.chatMessages;
    storage.chatMessages.forEach((message) => {
      showMessage(message);
    });
  });

  // Ensure connection is established on first load
  chrome.runtime.sendMessage({
    type: "control",
    action: "ensureconnect",
  });
});
