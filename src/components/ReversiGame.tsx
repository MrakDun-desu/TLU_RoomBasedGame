import { type ReversiState, type RoomInfo, type Vec2 } from "../types";
import "./ReversiGame.css";

interface Props {
  roomInfo: RoomInfo
  playerNum: number
  onStateChange: (newState: ReversiState) => void
}

const BOARD_SIZE = 8;

// function getHeuristic(this: ReversiState): number {
//   // TODO
//   return 0
// }
//
// function getNextStates(this: ReversiState): Array<ReversiState> {
//   const output: ReversiState[] = []
//   return output
// }
//
// function getNextPositions(this: ReversiState): Vec2[] {
//   const output: Vec2[] = []
//   return output
// }

function vec2Compare(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y
}


const ReversiGame = (
  { playerNum, roomInfo, onStateChange }: Props
) => {
  const gameState = roomInfo.gameState
  const playerColor = playerNum === 1
    ? "white"
    : "black";
  const isSpectator = playerNum > 2;
  const isCurrentTurn =
    gameState.player1Turn && playerNum === 1 ||
    !gameState.player1Turn && playerNum === 2;

  const connectedPeople = Object.keys(roomInfo.players).length;

  if (connectedPeople < 2) {
    return <div>Waiting for second player...</div>;
  }

  return (
    <div>
      <div className="game-info">
        <p>{isSpectator ? "You're spectating" : `You're playing as ${playerColor}`}</p>
        <p>{connectedPeople} {connectedPeople === 1 ? "connected person" : "connected people"}</p>
      </div>
      {
        !isSpectator &&
        <p className="turn-indicator">
          {isCurrentTurn ? "Your turn" : "Your opponent's turn"}
        </p>
      }
      <div className="reversi-container">
        {
          Array.from({ length: BOARD_SIZE }, (_, i) => i).flatMap(x => {
            return Array.from({ length: BOARD_SIZE }, (_, i) => i).map(y => {
              let className = "reversi-cell";
              const isWhiteTile = gameState.whitePositions.some(val => vec2Compare(val, { x, y }))
              const isBlackTile = gameState.blackPositions.some(val => vec2Compare(val, { x, y }))
              if (isWhiteTile) {
                className += " white";
              }
              if (isBlackTile) {
                className += " black";
              }

              return <div
                className={className}
                key={`${x}${y}`}
                onClick={() => {
                  if (isBlackTile || isWhiteTile || !isCurrentTurn) {
                    return;
                  }
                  if (gameState.player1Turn) {
                    gameState.whitePositions.push({ x, y })
                  } else {
                    gameState.blackPositions.push({ x, y })
                  }
                  gameState.player1Turn = !gameState.player1Turn;
                  onStateChange(gameState);
                }}
              />
            })
          })
        }
      </div>
    </div>
  );
}

export default ReversiGame;
