import * as firebaseDb from 'firebase/database';
import "./App.css";
import { useState } from 'react';
import { DefaultReversiState, type RoomInfo } from './types';
import ReversiGame from './components/ReversiGame';
import { getRandomString } from './helpers';
import { deleteApp, initializeApp } from 'firebase/app';

// TODO: Change player numbers to registering white and black by ID
// TODO: Add button to reset game state
// TODO: Program game logic
// Optional  TODO: Add minimax
interface RoomDetails {
  id: string,
  roomInfo: RoomInfo,
  playerId: string,
  playerNum: number,
  disconnectRef: firebaseDb.OnDisconnect
}

const roomTempl = (roomId: string) => `rooms/${roomId}`;
const playerTempl = (roomId: string, playerId: string) => `rooms/${roomId}/players/${playerId}`;
const gameStateTempl = (roomId: string) => `rooms/${roomId}/gameState`;
const playersTempl = (roomId: string) => `rooms/${roomId}/players`;

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
      firebaseDb.remove(firebaseDb.ref(db, playerTempl(room.id, room.playerId)));
      room.disconnectRef.cancel();
    }
    if (id === null) {
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
    const playerNum = roomInfo !== null
      ? Object.keys(roomInfo.players).length + 1
      : 1;
    const playerRef = await firebaseDb.push(firebaseDb.ref(db, playersTempl(id)), true);
    if (roomInfo === null) {
      await firebaseDb.set(firebaseDb.ref(db, gameStateTempl(id)), DefaultReversiState)
    }
    const disconnectRef = firebaseDb.onDisconnect(playerRef);
    disconnectRef.remove();

    roomInfo ??= {
      players: {},
      gameState: DefaultReversiState
    }

    setRoom({
      id,
      roomInfo,
      playerId: playerRef.key!,
      playerNum,
      disconnectRef
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
        roomId = getRandomString(4);
        roomRef = firebaseDb.ref(db, roomTempl(roomId));
        let snapshot = await firebaseDb.get(roomRef);
        if (!snapshot.exists() || Object.keys(snapshot.val().players).length === 0) {
          break;
        }
        repeatCounter--;
        if (repeatCounter == 0) {
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
        <form onSubmit={e => { e.preventDefault(); createRoom(); }}>
          <button type="submit">Create a room</button>
        </form>
        <form className="join-form" onSubmit={e => { e.preventDefault(); joinRoom(); }}>
          <label htmlFor="roomId">Room ID:</label>
          <input
            type="text"
            value={roomIdToJoin}
            onChange={e => setRoomIdToJoin(e.target.value.toUpperCase())}
          />
          <button type="submit">Join a room</button>
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
        room !== null &&
        <>
          <h2>Connected to room {room.id}</h2>
          <ReversiGame
            roomInfo={room.roomInfo}
            playerNum={room.playerNum}
            onStateChange={newState => {
              firebaseDb.set(firebaseDb.ref(db, gameStateTempl(room.id)), newState)
            }}
          />
        </>
      }
    </div>
  )
}

export default App
