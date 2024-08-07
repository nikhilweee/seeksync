# seeksync

Browser extension for synchronized video playback.

![Seeksync Screenshot](https://i.imgur.com/PeMSkZK.jpg)

## Summary

- Synchronize play, pause and seek actions between users.
- Send messages to each other using the chat feature.
- Free and open source. Have complete control over your data.
- Requires hosting your own sync server.
- Currently only supports Netflix.

## Getting Started

This extension is based on a client-server architecture, and has two components:

1. A browser extension (the client) to relay actions to / from the server.
2. A server (seekserver) to coordinate communication between clients.

The browser extension can be installed from the
[Chrome Web Store](https://chromewebstore.google.com/detail/seeksync/jlofdbpgmgeokldbfhlcihikebgmpnoa).
A simple websockets based python server is available at `seekserver/server.py`.
To get started, every user needs to install the extension on their browsers.
However, only instance of the server can cater to multiple clients.

Follow these steps for detailed instructions on how to install the extension and
setup the server.

## Extension Setup

You can either install the extension from the Chrome Web Store, or download the
latest version of the extension as a ZIP file and manually install it. For
simplicity, we recommend the Chrome Web Store.

### Chrome Web Store

You can install the extension from the
[Chrome Web Store](https://chromewebstore.google.com/detail/seeksync/jlofdbpgmgeokldbfhlcihikebgmpnoa).

### Download ZIP

1. Download this repository. Go to https://github.com/nikhilweee/seeksync/,
   click on the green `Code` button on the top right, then click `Download ZIP`.
   Unzip the file after downloading.
2. On Chrome, open the extensions page. On the top right of the toolbar, click
   `⋮` > `Extensions` -> `Manage Extensions`, or go to `chrome://extensions`
   from the address bar.
3. Enable developer mode. Click the toggle on top right which says
   `Developer mode`.
4. Install the extension. Click on `Load unpacked` and navigate to the unzipped
   download location. Select the inner `seeksync` folder.

## Server Setup

The server is a simple python script that can be hosted on any machine with a
publicly reachable IP address. The server script is available at
`seekserver/server.py`. An easy way to run the server is to host it on any cloud
VM provider with a public IP. You can either run the server manually, or use
Docker Compose. The instructions assume that you are running the server on a
linux machine with a public IP of `11.22.33.44`.

### Docker Compose

Just navigate to `seeksync/seekserver` and spin up a container:

```console
$ # Run this from seeksync/seekserver
$ docker compose up -d
```

The server should be ready to serve connections at `11.22.33.44:5678`

### Manual Setup

A working installation of Python is required.

1. Create a virtual environment (optional)

   ```console
   $ # Run this from seeksync/seekserver
   $ python3 -m venv .venv
   $ source .venv/bin/activate
   ```

2. Install dependencies

   ```console
   $ pip install -r requirements.txt
   ```

3. Start the server

   ```console
   $ python server.py
   ```

Like before, clients should be able to connect to `11.22.33.44:5678`

## Usage

Follow these steps to setup a connection to the server and enjoy watching videos
in sync.

### Connect to the Server

1. Activate the extension by clicking its icon on the toolbar. If the icon isn't
   visible, click on the extensions button (shaped like a jigsaw) on the toolbar
   and click SeekSync. You should see the sidepanel open up.
2. On the sidepanel, click `⚙` and enter some details.
   1. In the server field, enter the public IP of your server
      `11.22.33.44:5678`.
   2. The room name can be anything as long as all users use the same room name.
   3. Choose any username to identify yourself in the room.
3. Click the toggle right next to the settings icon. If everything goes well,
   you should see a message saying `Connected to <server address>`.

### Start Watching

1. To watch videos together as a group, ask all users to connect using the same
   server and the same room. Make sure each user sets a unique username.
2. Start watching something on a supported platform. Other users should get a
   message with the link to the video that you are watching. Ask them to click
   on that link so they are "on the same page".
3. From here on, every user watching the same video should have synchronized
   playback. Whenever someone performs an action (pause, play or seek), the
   action will be performed for all users. A message will also appear on the
   chat window every time someone performs an action.
4. If you face any issues, try refreshing the page to trigger a refresh.
5. To disconnect and exit the room, press the toggle next to `⚙`.

## Documentation

Additional documentation can be found in [DOCS.md](DOCS.md).
