# Documentation

## Concepts

Chrome extensions consist of different kinds of scripts, each with a different
set of abilities.

- The background script has access to most of chrome's APIs but doesn't have
  access to the DOM.
- The content script has access to the DOM but does not share the same
  environment as the webpage.
- The injected script has acceess to the DOM and shares the same environment as
  the webpage but does not have access to chrome's APIs.

Here's a table for quick reference.

| Script     | `document.*` | `window.*` | `chrome.*` |
| ---------- | ------------ | ---------- | ---------- |
| Background | No           | No         | Yes        |
| Content    | Yes          | No         | Limited    |
| Injected   | Yes          | Yes        | No         |

## Layout

This extension needs to coordinate between different kinds of scripts. Here are
some script files used in the extension and their types.

- `sidepanel/script.js`: sidepanel
- `scripts/websockets.js`: content
- `scripts/<platform>/inject.js`: inject
- `scripts/<platform>/content.js`: content
- `service-worker.js`: background

Here's how the entire workflow happens.

- The actual interaction with the video player happens through the injected
  script. This script needs to communicate with the content script using
  `window.postMessage`.
- The content script maintains communication with the server using a `WebSocket`
  client. It receives messages from the injected script and passes them over to
  the websocket if required. It also receives messages from the websocket and
  passes them on to the injected script using `window.postMessage` when
  required.
- The sidebar shows a UI with messages received from the server.

## Message Formats

Let's think about the kinds of messages that we need to send between different
components of the extension.

1. A chat message that needs to show up on the chat panel. This can either come
   from the user when they type a message, or from the server when another user
   types a message or a system message needs to be shown.
2. A control message that either the client sends to the server to indicate the
   current position, or the server sends the client to sync the player.

```js
// Client to server messages must have username and roomname
// Only server to client user chat messages must have username and roomname

// Connect message from client to server
// Sent when user presses the connect button.
{'type': 'control', 'action': 'connect', 'roomname': 'default', 'username': 'chrome'}

// Action message from client to server.
// Sent when user performs a play/pause action.
{'type': 'control', 'sender': 'client', 'action': 'pause', 'url': 'url', 'time': 12345, 'roomname': 'default', 'username': 'chrome'}

// User chat message from client to server (or server to client)
// Broadcast to all users when someone posts a chat message.
{'type': 'chat', 'sender': 'user', 'text': 'message', 'username': 'chrome', 'roomname': 'default'}

// System chat message (notification) from server to client
// Notify users when another user joins, leaves, plays or pauses
{'type': 'chat', 'sender': 'system', 'text': 'message'}

// Action message from server to client
// This is the message that plays/pauses the video
{'type': 'control', 'sender': 'server', 'action': 'pause', 'time': 12345}
```

## Icons

Use librsvg to convert SVG to PNG files.

```shell
# run these commands from the images directory
rsvg-convert svg/icon-blue.svg -o icon-blue-512.png -h 512 -w 512
rsvg-convert svg/icon-green.svg -o icon-green-128.png -h 128 -w 128
rsvg-convert svg/icon-gray.svg -o icon-gray-128.png -h 128 -w 128
```

## Debugging

Use this function to recursively search an object `obj` for a string `string`.

```js
function search(obj, string) {
  const maxDepth = 10;
  const excludeKeys = ["_root"];

  function isObject(val) {
    return typeof val === "function" || typeof val === "object";
  }

  function traverse(obj, depth, path) {
    // Guard clause
    if (depth > maxDepth) {
      return;
    }

    if (obj === null) {
      // Helps simplify object checking
      return;
    } else if (isObject(obj)) {
      // Handle objects
      for ([key, value] of Object.entries(obj)) {
        if (excludeKeys.includes(key)) {
          continue;
        }
        traverse(value, depth + 1, path.concat(key));
      }
    } else if (Array.isArray(obj)) {
      // Handle arrays
      obj.forEach((item, index) => {
        traverse(item, depth + 1, path.concat(index));
      });
    } else {
      // Handle primitive data types
      if (String(obj).includes(string)) {
        console.log(`${path.join(".")}: ${obj}`);
      }
    }
  }

  traverse(obj, 0, []);
}

// Example usage:
const obj = {
  key1: "value1",
  nested: {
    key2: "needle here",
    key3: 42,
    deeper: {
      key4: "still going",
      more: {
        key5: "needle again",
        evenDeeper: {
          key6: "deepest needle",
        },
      },
    },
  },
  array: [1, "needle", { key7: "value7" }],
};

search(obj, "needle");

// Expected Output
// nested.key2: needle here
// nested.deeper.more.key5: needle again
// nested.deeper.more.evenDeeper.key6: deepest needle
// array.1: needle
```
