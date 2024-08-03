let sessionId = null;

/** Receive message from websocket and perform action */
window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return; // Only accept messages from the same window
  }
  if (event?.data?.sender === "server") {
    console.log("relay window to action: ", event.data);
    seekVideo(event.data.action, event.data.time);
  }
});

/** Perform the actual seek or pause or play operation */
function seekVideo(action, ms) {
  const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer;
  const [playerSessionId] = videoPlayer.getAllPlayerSessionIds();
  const player = videoPlayer.getVideoPlayerBySessionId(playerSessionId);

  if (action === "play" && !player.isPlaying()) {
    player.play();
  }
  if (action === "pause" && !player.isPaused()) {
    player.pause();
  }
  // Do not seek unless the difference is more than 100ms
  if (Math.abs(player.getCurrentTime() - ms) > 100) {
    player.seek(ms);
  }
}

/** Register event listener when video is played or paused */
function register() {
  const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer;
  const [playerSessionId] = videoPlayer.getAllPlayerSessionIds();

  if (!playerSessionId.startsWith("watch")) {
    console.log("SeekSync Inject: Waiting");
    setTimeout(register, 100);
    return;
  }

  const player = videoPlayer.getVideoPlayerBySessionId(playerSessionId);

  if (!player) {
    console.log("SeekSync Inject: Waiting");
    setTimeout(register, 100);
    return;
  }

  console.log("SeekSync Inject: Found");
  let actions = ["playingchanged"];
  actions.forEach((action) => {
    player.addEventListener(action, (event) => {
      {
        const message = {
          sender: "client",
          action: event.target.isPlaying() ? "play" : "pause",
          time: event.target.getCurrentTime(),
        };
        console.log("relay action to window: ", message);
        window.postMessage(message);
      }
    });
  });
}

/** Helper function to evaluate glob matches */
function matchGlob(url, pattern) {
  let regexPattern = pattern
    // Escape dot and slashes
    .replace(/([./\\])/g, "\\$1")
    // Convert * to .*
    .replace(/\*/g, ".*");
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(url);
}

/** Listen for navigation changes and trigger register function */
window.navigation.addEventListener("navigate", (event) => {
  const match = matchGlob(
    event.destination.url,
    "https://www.netflix.com/watch/*"
  );
  if (match) {
    register();
  }
});

// register();
