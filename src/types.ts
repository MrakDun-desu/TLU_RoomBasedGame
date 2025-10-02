export interface RoomInfo {
  players: Record<string, boolean>
  gameState: ReversiState
};

export interface Vec2 {
  x: number
  y: number
}

export interface ReversiState {
  blackPositions: Vec2[]
  whitePositions: Vec2[]
  player1Turn: boolean
}

export const DefaultReversiState = {
  blackPositions: [{ x: 3, y: 3 }, { x: 4, y: 4 }],
  whitePositions: [{ x: 3, y: 4 }, { x: 4, y: 3 }],
  player1Turn: true
}

