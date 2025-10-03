export interface RoomInfo {
  whiteId?: string // ID of the white player
  blackId?: string // ID of the black player
  connectedUsers: Record<string, string> // map of user ID to username
  gameState: ReversiState
};

export interface Vec2 {
  x: number
  y: number
}

export interface ReversiState {
  blackPositions?: Vec2[]
  whitePositions?: Vec2[]
  whiteTurn: boolean
}

export const DefaultReversiState: ReversiState = {
  blackPositions: [{ x: 3, y: 3 }, { x: 4, y: 4 }],
  whitePositions: [{ x: 3, y: 4 }, { x: 4, y: 3 }],
  whiteTurn: true
}

