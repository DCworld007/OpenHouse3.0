-- User table
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  image TEXT
);

-- PlanningRoom table
CREATE TABLE IF NOT EXISTS PlanningRoom (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  ownerId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- RoomMember table
CREATE TABLE IF NOT EXISTS RoomMember (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  roomId TEXT NOT NULL,
  role TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Card table
CREATE TABLE IF NOT EXISTS Card (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  notes TEXT,
  cardType TEXT,
  imageUrl TEXT,
  groupId TEXT,
  userId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- CardRoomLink table
CREATE TABLE IF NOT EXISTS CardRoomLink (
  cardId TEXT NOT NULL,
  roomId TEXT NOT NULL,
  PRIMARY KEY (cardId, roomId)
);

-- Message table
CREATE TABLE IF NOT EXISTS Message (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  userId TEXT NOT NULL,
  roomId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Reaction table
CREATE TABLE IF NOT EXISTS Reaction (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  userId TEXT NOT NULL,
  messageId TEXT,
  cardId TEXT,
  createdAt TEXT NOT NULL
);

-- ActivityLog table for activity feed persistence
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  groupId TEXT NOT NULL,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  context TEXT, -- JSON string
  timestamp INTEGER NOT NULL
); 