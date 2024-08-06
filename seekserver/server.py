import websockets
import asyncio
import logging
import json
import time

WebSocket = websockets.WebSocketClientProtocol

logging.basicConfig(
    format="%(asctime)s [%(name)s] %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
    force=True,
)
logger = logging.getLogger("seekserver")


class User:
    def __init__(self, username):
        self.username = username
        self.websocket = None
        self.roomname = None
        self.state: dict = {}
        self.time = None
        self.url = None


class Room:
    def __init__(self, roomname):
        self.users: dict[str, User] = {}
        self.state: dict = {}
        self.roomname = roomname

    def get_user(self, username):
        if username not in self.users:
            user = User(username)
            user.roomname = self.roomname
            self.users[username] = user
        return self.users[username]

    def get_all_users(self):
        return list(self.users.values())


class Server:
    def __init__(self):
        self.connections: dict[WebSocket, str] = {}
        self.rooms: dict[str, Room] = {}

    # Utilities

    def get_room(self, roomname):
        if roomname not in self.rooms:
            self.rooms[roomname] = Room(roomname)
        return self.rooms[roomname]

    def broadcast_json(self, message: dict, users: list):
        if not users:
            return
        usernames = [user.username for user in users]
        logger.info(f"SEND {usernames} {message}")
        connections = [user.websocket for user in users]
        message = json.dumps(message)
        websockets.broadcast(connections, message)

    def parse_message(self, websocket, message):
        roomname = message["roomname"]
        username = message["username"]

        self.connections[websocket] = roomname

        room = self.get_room(roomname)
        user = room.get_user(username)
        user.websocket = websocket

        return room, user

    # Parent Handlers

    def handle_connect(self, websocket):
        logger.info(f"connected: {websocket}")
        if websocket not in self.connections:
            self.connections[websocket] = None

    def handle_disconnect(self, websocket):
        logger.info(f"disconnected: {websocket}")
        if websocket not in self.connections:
            return
        roomname = self.connections[websocket]
        room = self.get_room(roomname)
        users = room.get_all_users()

        username = "someone"
        for user in users:
            if user.websocket == websocket:
                username = user.username

        message = {
            "type": "chat",
            "sender": "system",
            "text": username + " left the room",
            "ts": time.time(),
        }

        self.connections.pop(websocket)
        room.users.pop(username)
        self.broadcast_json(message, users)

    def handle_message(self, websocket, message):
        if message["type"] == "chat":
            self.handle_chat(websocket, message)
        if message["type"] == "control":
            if message["action"] in ["pause", "play"]:
                self.handle_control_play_pause(websocket, message)
            if message["action"] in ["connect"]:
                self.handle_control_connect(websocket, message)

    # Child Handlers

    def handle_chat(self, websocket, message):
        room, _ = self.parse_message(websocket, message)
        all_users = room.get_all_users()
        self.broadcast_json(message, all_users)

    def handle_control_connect(self, websocket, message):
        room, _ = self.parse_message(websocket, message)

        # Broadcast join message to other users

        other_users = []
        for user in room.get_all_users():
            if user.websocket == websocket:
                continue
            other_users.append(user)

        message_dict = {
            "type": "chat",
            "sender": "system",
            "text": message["username"] + " entered the room",
            "ts": time.time(),
        }

        self.broadcast_json(message_dict, other_users)

    def handle_control_play_pause(self, websocket, message):
        room, user = self.parse_message(websocket, message)
        all_users = room.get_all_users()

        # Update current user state

        user.state["action"] = message["action"]
        user.state["time"] = message["time"]
        user.state["url"] = message["url"]

        # Reject reaction messages in response to control message

        if (
            room.state.get("action") == message["action"]
            and room.state.get("url") == message["url"]
        ):
            return

        # Update current room state

        room.state["action"] = message["action"]
        room.state["time"] = message["time"]
        room.state["url"] = message["url"]

        # At this point we group two kinds of users:
        # other_users: Users who are watching a different video.
        # same_users: Users who are watching the same video.
        # outsync_users: Users who are watching the same video,
        #     but are out of sync with the current user.

        # Broadcast URL to other_users

        other_users, same_users = [], []
        for user in all_users:
            if user.state.get("url") != message["url"]:
                other_users.append(user)
            else:
                same_users.append(user)

        url = message["url"]
        title = message["title"]
        link = f"<a href='{url}' target='_blank'>{title}</a>"

        if message["action"] == "pause":
            text = message["username"] + " paused " + link
        if message["action"] == "play":
            text = message["username"] + " resumed " + link

        message_dict = {
            "type": "chat",
            "sender": "system",
            "text": text,
            "ts": time.time(),
        }

        self.broadcast_json(message_dict, other_users)

        # Broadcast control message to outsync_users

        outsync_users = []
        for user in same_users:
            # Don't sync with current user
            if user.websocket == websocket:
                continue
            # Don't sync if drift is less than 100ms
            if "time" in user.state and "action" in user.state:
                if (
                    user.state["action"] == message["action"]
                    and abs(user.state["time"] - message["time"]) < 10
                ):
                    continue
            outsync_users.append(user)

        message_dict = {
            "type": "control",
            "sender": "server",
            "action": message["action"],
            "time": message["time"],
        }

        self.broadcast_json(message_dict, outsync_users)

        # Broadcast chat message to same_users

        mm, ss = divmod(message["time"] // 1000, 60)
        hh, mm = divmod(mm, 60)
        ts = f"{mm:02d}:{ss:02d}"
        if hh > 0:
            ts = f"{hh:02d}:" + ts

        if message["action"] == "pause":
            text = message["username"] + " paused at " + ts
        if message["action"] == "play":
            text = message["username"] + " resumed at " + ts

        message_dict = {
            "type": "chat",
            "sender": "system",
            "text": text,
            "ts": time.time(),
        }

        self.broadcast_json(message_dict, same_users)


server = Server()


async def echo(websocket):
    try:
        async for message in websocket:
            try:
                message = json.loads(message)
                logger.info(f"RECV {message}")
                server.handle_message(websocket, message)
            except json.JSONDecodeError:
                pass
                # mostly keepalive messages
                # logger.info(f"received keepalive {message}")
    except Exception as e:
        logger.info(e)
    finally:
        server.handle_disconnect(websocket)


async def main():
    host, port = "0.0.0.0", 5678
    logger.info(f"Starting server on host {host} port {port}.")
    async with websockets.serve(echo, host, port):
        await asyncio.Future()  # run forever


asyncio.run(main())
