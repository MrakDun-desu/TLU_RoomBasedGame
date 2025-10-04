import { DefaultReversiState, type ReversiState, type RoomInfo, type Vec2 } from "../types";
import "./ReversiGame.css";

interface Props {
  roomInfo: RoomInfo
  playerId: string
  onStateChange: (newState: ReversiState) => void
}

interface NextPos {
  pos: Vec2
  dirs: Vec2[]
}
const BOARD_SIZE = 8;
const DIRECTIONS: Vec2[] = Array.from({ length: 3 }, (_, i) => i - 1).flatMap(x =>
  Array.from({ length: 3 }, (_, i) => i - 1).map(y => { return { x, y } })
)

function vec2Eq(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y
}

function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

function vec2Neg(a: Vec2) {
  return { x: -a.x, y: -a.y }
}

function getNextPositions(self: ReversiState): NextPos[] {
  const output: NextPos[] = []
  const toCheck = self.whiteTurn
    ? self.whitePositions
    : self.blackPositions;

  if (toCheck === undefined) {
    return output
  }

  for (const pos of toCheck) {
    for (const dir of DIRECTIONS) {
      const nextPos = checkNextPos(self, pos, dir)
      if (nextPos === null) {
        continue;
      }
      const entry = output.find(val => vec2Eq(val.pos, nextPos))
      if (entry === undefined) {
        output.push({ pos: nextPos, dirs: [vec2Neg(dir)] });
      } else {
        entry.dirs.push(vec2Neg(dir));
      }
    }
  }

  return output
}

function checkNextPos(self: ReversiState, pos: Vec2, dir: Vec2): Vec2 | null {
  const getCellType = (cell: Vec2): "white" | "black" | "empty" => {
    if (self.whitePositions?.some(p => vec2Eq(p, cell))) {
      return "white";
    }
    if (self.blackPositions?.some(p => vec2Eq(p, cell))) {
      return "black";
    }
    return "empty"
  }

  const posType = getCellType(pos)
  // if starting from empty cell, there can be no new move generated
  // shouldn't ever happen but better to check
  if (posType === "empty") {
    return null;
  }
  let curPos = pos;
  let passedOther = false;
  while (true) {
    curPos = vec2Add(curPos, dir);
    if (curPos.x >= BOARD_SIZE || curPos.x < 0
      || curPos.y >= BOARD_SIZE || curPos.y < 0) {
      break;
    }
    const curType = getCellType(curPos)
    // if the cell is the same type as the starting one, no move
    if (curType === posType) {
      break;
    }
    // if the cell is of the other color, it's loooking promising
    if (curType === "white" && posType === "black" ||
      curType === "black" && posType === "white") {
      passedOther = true;
      continue;
    }
    // if the cell is empty, we return depending on whether we passed other color or not
    if (curType === "empty") {
      return passedOther ? curPos : null;
    }
  }

  return null;
}

const ReversiGame = (
  { playerId, roomInfo, onStateChange }: Props
) => {
  if (roomInfo.whiteId === undefined || roomInfo.blackId === undefined) {
    return <p>Waiting for players...</p>
  }

  const gameState = roomInfo.gameState
  const playerGreeting = roomInfo.whiteId === playerId
    ? "You're playing as white"
    : roomInfo.blackId === playerId
      ? "You're playing as black"
      : "You're spectating"

  const isCurrentTurn =
    gameState.whiteTurn && roomInfo.whiteId === playerId ||
    !gameState.whiteTurn && roomInfo.blackId === playerId

  const nextPositions = getNextPositions(gameState)

  let result: "White wins" | "Black wins" | "Draw" | null = null;
  if (nextPositions.length === 0) {
    const whiteCount = gameState.whitePositions?.length ?? 0
    const blackCount = gameState.blackPositions?.length ?? 0
    if (whiteCount > blackCount) {
      result = "White wins"
    } else if (blackCount > whiteCount) {
      result = "Black wins"
    } else {
      result = "Draw"
    }
  }

  return (
    <div>
      <div className="game-info">
        <p>{playerGreeting}</p>
      </div>
      {
        <p className="turn-indicator">
          {gameState.whiteTurn ? "White turn" : "Black turn"}
        </p>
      }
      <div className="reversi-container">
        {
          result !== null &&
          <div className="result-screen">
            <h2>{result}</h2>
            {
              (roomInfo.whiteId === playerId || roomInfo.blackId === playerId) &&
              <button
                type="button"
                onClick={() => {
                  onStateChange(DefaultReversiState)
                }}
              >
                New Game
              </button>

            }
          </div>
        }
        {
          Array.from({ length: BOARD_SIZE }, (_, i) => i).flatMap(x => {
            return Array.from({ length: BOARD_SIZE }, (_, i) => i).map(y => {
              let className = "reversi-cell";
              const isWhiteTile = gameState.whitePositions?.some(val => vec2Eq(val, { x, y }))
              const isBlackTile = gameState.blackPositions?.some(val => vec2Eq(val, { x, y }))
              const nextPos = nextPositions.find(val => vec2Eq(val.pos, { x, y }))
              if (isWhiteTile) {
                className += " white";
              }
              if (isBlackTile) {
                className += " black";
              }
              if (nextPos !== undefined) {
                className += " next";
                className += gameState.whiteTurn
                  ? " white"
                  : " black";
                if (isCurrentTurn) {
                  className += " clickable"
                }
              }

              return <div
                className={className}
                key={`${x}${y}`}
                onMouseOver={() => {
                  if (nextPos === undefined) {
                    return
                  }
                }}
                onClick={() => {
                  if (nextPos === undefined || !isCurrentTurn) {
                    return;
                  }
                  gameState.whitePositions ??= []
                  gameState.blackPositions ??= []
                  const [toAdd, toRemove] = gameState.whiteTurn
                    ? [gameState.whitePositions, gameState.blackPositions]
                    : [gameState.blackPositions, gameState.whitePositions]
                  toAdd.push({ x, y })
                  for (const dir of nextPos.dirs) {
                    let pos = { x, y }
                    while (true) {
                      pos = vec2Add(pos, dir);
                      const removeIndex = toRemove.findIndex(val => vec2Eq(val, pos))
                      if (removeIndex === -1) {
                        break;
                      }
                      toAdd.push(pos)
                      toRemove.splice(removeIndex, 1)
                    }
                  }
                  gameState.whiteTurn = !gameState.whiteTurn;
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
