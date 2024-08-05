# seeksync

Browser extension to watch videos in sync.

Seeksync lets you sync seek positions with everyone else in the room.

\* Currently only supports Netflix. Get it from the
[Chrome Web Store](https://chromewebstore.google.com/detail/seeksync/jlofdbpgmgeokldbfhlcihikebgmpnoa).

![Seeksync Screenshot](https://i.imgur.com/PeMSkZK.jpg)

## Getting Started

This extension is based on a client-server architecture. Besides the browser
extension (the client), it also requires a server to facilitate communication
between different clients. A simple websockets based python server is included
in this repository (`seekserver/server.py`).

To get started, each user needs to install the browser extension on their
machine. However, one instance of the server can cater to multiple clients.
Follow these steps to install the extension and setup the server.

## Server Setup

The server is a simple python script that can be run on any machine with a
publicly reachable IP address. You can find this script as
`seekserver/server.py`. An easy way to run the server is to host it on any cloud
VM provider.

### Docker Compose

If you wish to host the server using docker compose, just navigate to
`seeksync/seekserver` and spin up a container:

```console
# Run this command from the seeksync/seekserver directory
$ docker compose up -d
```

### Manual Setup

The instructions assume that you are running the server on a linux machine with
a public IP of `11.22.33.44`. A working installation of Python is required.

1. Create a virtual environment (optional)

   ```console
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies

   ```console
   $ pip install websockets
   ```

3. Start the server

   ```console
   $ python server.py
   ```

4. Your clients should be able to connect to `11.22.33.44:5678`

## Extension Setup

### Chrome Web Store

You can install the extension from the
[Chrome Web Store](https://chromewebstore.google.com/detail/seeksync/jlofdbpgmgeokldbfhlcihikebgmpnoa).

### Download ZIP

1. Download this repository. Go to https://github.com/nikhilweee/seeksync/,
   click on the green `Code` button on the top right, then click `Download ZIP`.
2. On Chrome, open the extensions page. Click `Three Dots` > `Extensions` ->
   `Manage Extensions`, or go to `chrome://extensions` from the address bar.
3. Enable developer mode. Click the switch on top right which says
   `Developer mode`.
4. Install the extension. Click on `Load unpacked` and navigate to the unzipped
   download location. Select the inner `seeksync` folder.
5. Activate the extension by clicking its icon on the toolbar. If the icon isn't
   visible, click on the extensions button (jigsaw button) and click SeekSync.
   You should see the sidebar open up.
6. Click on the settings icon and enter the server address `11.22.33.44:5678`.
   The room name can be anything as long as all users use the same room name.
   Choose any username to identify yourself in the room.
7. Click on the toggle right next to the settings icon. If everything goes well,
   you should see a message saying `<username> entered the room`
8. To start watching videos in sync, open your favourite video on your preferred
   platform and start watching. If you face issues, try refreshing the page.

## Usage

1. To watch a video together, ask all users to connect using the same server and
   the same room. Make sure each user sets a unique username.
2. Whenever someone starts watching a video, a message will be sent to all other
   users with the URL of the video. Any user can click on this URL to open the
   video's webpage.
3. From there, every user who is watching the same video should have
   synchronized playback. A message appears on the chat window every time anyone
   changes the playback state of the video.

## Documentation

Additional documentation can be found in [DOCS.md](DOCS.md).
