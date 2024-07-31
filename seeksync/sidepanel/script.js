document.addEventListener("DOMContentLoaded", function () {
  const inputNames = ["servername", "roomname", "username"];
  const saveButton = document.getElementById("save");

  // Load saved values from storage and populate inputs
  chrome.storage.local.get(inputNames, function (storage) {
    inputNames.forEach((name) => {
      const input = document.getElementById(name);
      if (storage[name]) {
        input.value = storage[name];
      }
    });
  });

  // Add messages from the rest of the extension
  chrome.runtime.onMessage.addListener((message) => {
    console.log("sidepanel onmessage", message);
    if (message.type === "chat") {
      const chatHistory = document.getElementById("chatHistory");
      const update = document.createElement("div");
      if (message.sender === "user") {
        update.innerHTML = `<strong>${message.username}</strong>: ${message.text}`;
      }
      if (message.sender === "system") {
        update.innerHTML = `<em>${message.text}</em>`;
      }
      const date = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      update.innerHTML += `<span style="float:right">${date}</span>`;
      chatHistory.appendChild(update);
      chatHistory.scrollTop = chatHistory.scrollHeight; // Scroll to the bottom
    }
  });

  // Connect button handler
  document
    .getElementById("settingsForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
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
    });

  // Chat message handler
  document.getElementById("message").addEventListener("keypress", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const messageInput = document.getElementById("message");
      const usernameInput = document.getElementById("username");
      if (messageInput.value.trim() !== "") {
        chrome.runtime.sendMessage({
          type: "chat",
          sender: "user",
          text: messageInput.value,
          username: usernameInput.value,
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
});
