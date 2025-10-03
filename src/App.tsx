import * as firebaseDb from 'firebase/database';
import "./App.css";
import { useState } from 'react';
import { DefaultReversiState, type RoomInfo } from './types';
import ReversiGame from './components/ReversiGame';
import { getRandomString } from './helpers';
import { deleteApp, initializeApp } from 'firebase/app';

interface RoomDetails {
  id: string,
  roomInfo: RoomInfo,
  userId: string,
  disconnectRefs: firebaseDb.OnDisconnect[]
}

const roomTempl = (roomId: string) => `rooms/${roomId}`;
const gameStateTempl = (roomId: string) => `rooms/${roomId}/gameState`;
const usersTempl = (roomId: string) => `rooms/${roomId}/connectedUsers`;
const userTempl = (roomId: string, playerId: string) => `rooms/${roomId}/connectedUsers/${playerId}`;
const whiteIdTempl = (roomId: string) => `rooms/${roomId}/whiteId`
const blackIdTempl = (roomId: string) => `rooms/${roomId}/blackId`

const firebaseConfig = {
  apiKey: "AIzaSyBNGsVn4x0MfSIc27bLI7xb3xrAkvutSK0",
  authDomain: "tlu-ai-in-games.firebaseapp.com",
  databaseURL: "https://tlu-ai-in-games-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tlu-ai-in-games",
  storageBucket: "tlu-ai-in-games.firebasestorage.app",
  messagingSenderId: "1024932856602",
  appId: "1:1024932856602:web:e0c591e8a17eb0d3be62a3"
};

const app = initializeApp(firebaseConfig);
const db = firebaseDb.getDatabase(app);

window.addEventListener("unload", () => deleteApp(app));

const App = () => {
  const [waitStatus, setWaitStatus] = useState({ waiting: false, message: "" });
  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState<RoomDetails | null>(null);

  const onRoomInfoChange = (snapshot: firebaseDb.DataSnapshot) => {
    const newInfo: RoomInfo | null = snapshot.val();
    if (newInfo === null) {
      setRoom(null);
      return;
    }
    setRoom(prev => (prev === null) ? null : { ...prev, roomInfo: newInfo });
  }

  const changeRoom = async (id: string | null, createNew: boolean = false) => {
    if (room !== null) {
      const roomRef = firebaseDb.ref(db, roomTempl(room.id));
      firebaseDb.off(roomRef, "value", onRoomInfoChange);
      await firebaseDb.remove(firebaseDb.ref(db, userTempl(room.id, room.userId)));
      if (room.roomInfo.whiteId === room.userId) {
        await firebaseDb.remove(firebaseDb.ref(db, whiteIdTempl(room.id)));
      }
      if (room.roomInfo.blackId === room.userId) {
        await firebaseDb.remove(firebaseDb.ref(db, blackIdTempl(room.id)));
      }
      room.disconnectRefs.forEach(ref => ref.cancel());
    }
    if (id === null) {
      setRoom(null);
      return;
    }

    if (username === "") {
      alert("Specify your username before joining a room");
      setRoom(null);
      return;
    }

    const roomRef = firebaseDb.ref(db, roomTempl(id));
    let roomInfo: RoomInfo | null = (await firebaseDb.get(roomRef)).val();
    if (roomInfo === null && !createNew) {
      setRoom(null);
      throw new Error(`Room info for room ${id} could not be retrieved`);
    }

    setWaitStatus({ waiting: true, message: "Joining room..." });
    const userRef = await firebaseDb.push(firebaseDb.ref(db, usersTempl(id)), username);
    if (roomInfo === null) {
      await firebaseDb.set(firebaseDb.ref(db, gameStateTempl(id)), DefaultReversiState)
    }
    const disconnectRef = firebaseDb.onDisconnect(userRef);
    disconnectRef.remove();

    const userId = userRef.key!;
    const players: Record<string, string> = {}
    players[userId] = username

    roomInfo ??= {
      connectedUsers: players,
      gameState: DefaultReversiState
    }

    setRoom({
      id,
      roomInfo,
      userId: userId,
      disconnectRefs: [disconnectRef]
    });

    firebaseDb.onValue(roomRef, onRoomInfoChange);
  }

  const createRoom = async () => {
    if (waitStatus.waiting) {
      alert("Wait before creating new room");
      return;
    }

    setWaitStatus({ waiting: true, message: "Creating room..." });
    try {
      // fancy room ID generation that could scale pretty well imo
      const repeatAmount = 5;
      let roomRef;
      let roomId;
      let letterCount = 4;
      let repeatCounter = repeatAmount;

      while (true) {
        roomId = getRandomString(letterCount);
        roomRef = firebaseDb.ref(db, roomTempl(roomId));
        const snapshot = await firebaseDb.get(roomRef);
        const snapshotVal: RoomInfo | null = snapshot.val();
        if (!snapshot.exists() || snapshotVal === null || Object.keys(snapshotVal.connectedUsers).length === 0) {
          break;
        }
        repeatCounter--;
        if (repeatCounter === 0) {
          repeatCounter = repeatAmount;
          letterCount++;
        }
      }

      await changeRoom(roomId, true);
    } catch (err) {
      alert("Error creating room, please try again");
      console.error(err);
    }
    setWaitStatus({ waiting: false, message: "" });
  };

  async function joinRoom() {
    if (waitStatus.waiting) {
      alert("Wait before joining a room");
      return;
    }
    setWaitStatus({ waiting: true, message: "Searching for room..." });
    try {
      await changeRoom(roomIdToJoin);
    } catch (err) {
      alert("Error connecting to room, please try again");
      console.error(err);
    }
    setWaitStatus({ waiting: false, message: "" });
  }

  async function leaveRoom() {
    if (waitStatus.waiting) {
      alert("Wait before joining a room");
      return;
    }
    setWaitStatus({ waiting: true, message: "Leaving room..." });
    try {
      changeRoom(null);
    } catch (err) {
      alert("Error leaving room");
      console.error(err);
    }
    setWaitStatus({ waiting: false, message: "" });
  }

  return (
    <div className="content">
      <h1>Reversi Online</h1>
      <div className="room-buttons">
        {
          room === null &&
          <div className="username">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              name="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
        }
        <form onSubmit={e => { e.preventDefault(); createRoom(); }}>
          <button type="submit">Create a room</button>
        </form>
        <form className="join-form" onSubmit={e => { e.preventDefault(); joinRoom(); }}>
          <button type="submit">Join a room</button>
          <label htmlFor="roomId">Room ID:</label>
          <input
            type="text"
            name="roomId"
            value={roomIdToJoin}
            onChange={e => setRoomIdToJoin(e.target.value.toUpperCase())}
          />
        </form>
        {
          room !== null &&
          <form onSubmit={e => { e.preventDefault(); leaveRoom(); }}>
            <button type="submit">Leave current room</button>
          </form>
        }
      </div>
      {
        waitStatus.waiting &&
        <div className="waiting-message">{waitStatus.message}</div>
      }
      {
        (room !== null && room.roomInfo.connectedUsers) &&
        <>
          <h2>Connected to room {room.id} as {room.roomInfo.connectedUsers[room.userId]}</h2>
          {
            room.roomInfo.whiteId !== undefined
              ? <p>
                White player: {
                  room.roomInfo.whiteId === room.userId
                    ? <strong>{room.roomInfo.connectedUsers[room.roomInfo.whiteId]}</strong>
                    : room.roomInfo.connectedUsers[room.roomInfo.whiteId]

                }
              </p>
              : room.userId === room.roomInfo.whiteId || room.userId === room.roomInfo.blackId
                ? ""
                : <button
                  style={{ marginRight: "1em" }}
                  onClick={() => {
                    const whiteRef = firebaseDb.ref(db, whiteIdTempl(room.id));
                    firebaseDb.set(whiteRef, room.userId);
                    const whiteDisconnect = firebaseDb.onDisconnect(whiteRef);
                    whiteDisconnect.remove();
                    room.disconnectRefs.push(whiteDisconnect);
                  }}
                >
                  Join as white
                </button>
          }
          {
            room.roomInfo.blackId !== undefined
              ? <p>
                Black player: {
                  room.roomInfo.blackId === room.userId
                    ? <strong>{room.roomInfo.connectedUsers[room.roomInfo.blackId]}</strong>
                    : room.roomInfo.connectedUsers[room.roomInfo.blackId]
                }
              </p>
              : room.userId === room.roomInfo.whiteId || room.userId === room.roomInfo.blackId
                ? ""
                : <button
                  onClick={() => {
                    const blackRef = firebaseDb.ref(db, blackIdTempl(room.id));
                    firebaseDb.set(blackRef, room.userId);
                    const blackDisconect = firebaseDb.onDisconnect(blackRef);
                    blackDisconect.remove();
                    room.disconnectRefs.push(blackDisconect);
                  }}
                >
                  Join as black
                </button>
          }
          <ReversiGame
            roomInfo={room.roomInfo}
            playerId={room.userId}
            onStateChange={newState => {
              firebaseDb.set(firebaseDb.ref(db, gameStateTempl(room.id)), newState)
            }}
          />
        </>
      }
    </div >
  )
}

export default App
