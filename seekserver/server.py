import websockets
import asyncio
import json
import time


class User:
    def __init__(self, username):
        self.username = username
        self.websocket = None
        self.roomname = None
        self.time = None


class Room:
    def __init__(self, roomname):
        self.users = {}
        self.roomname = roomname
        self.state = {}

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
        self.connections = {}
        self.rooms = {}

    # Utilities

    def get_room(self, roomname):
        if roomname not in self.rooms:
            self.rooms[roomname] = Room(roomname)
        return self.rooms[roomname]

    def broadcast_json(self, message: dict, users: list):
        usernames = " ".join([user.username for user in users])
        print("sent", usernames, message)
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

        all_users = room.get_all_users()

        return room, user, all_users

    # Parent Handlers

    def handle_connect(self, websocket):
        print("connected: ", websocket)
        if websocket not in self.connections:
            self.connections[websocket] = None

    def handle_disconnect(self, websocket):
        print("disconnected: ", websocket)
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
        _, _, all_users = self.parse_message(websocket, message)
        self.broadcast_json(message, all_users)

    def handle_control_play_pause(self, websocket, message):
        room, user, all_users = self.parse_message(websocket, message)

        user.time = message["time"]

        # Reject reaction messages in response to control message

        if room.state.get("action") == message["action"]:
            return

        # Update current room state

        room.state["action"] = message["action"]
        room.state["time"] = message["time"]

        if message["url"] != room.state.get("url"):
            room.state["url"] = message["url"]

            url = message["url"]
            title = message["title"]
            link = f"<a href='{url}' target='_blank'>{title}</a>"

            text = message["username"] + " is watching " + link

            message_dict = {
                "type": "chat",
                "sender": "system",
                "text": text,
                "ts": time.time(),
            }

            self.broadcast_json(message_dict, all_users)

        # Broadcast control message to other users

        filtered_users = []
        for user in all_users:
            if user.websocket == websocket:
                continue
            # Don't sync if drift is less than 100ms
            if user.time and "time" in message.keys():
                if abs(user.time - message["time"]) < 10:
                    continue
            filtered_users.append(user)

        message_dict = {
            "type": "control",
            "sender": "server",
            "action": message["action"],
            "time": message["time"],
        }

        self.broadcast_json(message_dict, filtered_users)

        # Broadcast chat message to all users

        filtered_users = all_users

        mm, ss = divmod(message["time"] // 1000, 60)
        if message["action"] == "pause":
            text = message["username"] + " paused at " + f"{mm:02d}:{ss:02d}"
        if message["action"] == "play":
            text = message["username"] + " resumed at " + f"{mm:02d}:{ss:02d}"

        message_dict = {
            "type": "chat",
            "sender": "system",
            "text": text,
            "ts": time.time(),
        }

        self.broadcast_json(message_dict, filtered_users)

    def handle_control_connect(self, websocket, message):
        room, user, all_users = self.parse_message(websocket, message)

        # Broadcast join message to all users

        filtered_users = all_users

        message_dict = {
            "type": "chat",
            "sender": "system",
            "text": message["username"] + " entered the room",
            "ts": time.time(),
        }

        self.broadcast_json(message_dict, filtered_users)


server = Server()


async def echo(websocket):
    try:
        async for message in websocket:
            try:
                message = json.loads(message)
                print("received", message)
                server.handle_message(websocket, message)
            except json.JSONDecodeError:
                pass
                # mostly keepalive messages
                # print("received keepalive", message)
    except Exception as e:
        print("exception", e)
    finally:
        server.handle_disconnect(websocket)


async def main():
    async with websockets.serve(echo, "localhost", 8765):
        await asyncio.Future()  # run forever


asyncio.run(main())
