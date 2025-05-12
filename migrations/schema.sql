-- PlanningRoom table
CREATE TABLE IF NOT EXISTS PlanningRoom (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  ownerId TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

-- LinkedGroup table
CREATE TABLE IF NOT EXISTS LinkedGroup (
  sourceGroupId TEXT NOT NULL,
  linkedGroupId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (sourceGroupId, linkedGroupId)
);

-- Card table
CREATE TABLE IF NOT EXISTS Card (
  id TEXT PRIMARY KEY,
  roomId TEXT,
  content TEXT,
  notes TEXT,
  cardType TEXT,
  "order" INTEGER,
  userId TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  reactions TEXT
);

-- PlanningRoomMember table
CREATE TABLE IF NOT EXISTS PlanningRoomMember (
  roomId TEXT,
  userId TEXT,
  role TEXT,
  joinedAt TEXT,
  PRIMARY KEY (roomId, userId)
);

-- InviteTokens table
CREATE TABLE IF NOT EXISTS InviteTokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT,
  planningRoomId TEXT,
  createdAt TEXT,
  expiresAt TEXT,
  maxUses INTEGER,
  usesCount INTEGER,
  isActive INTEGER
);

-- YjsDoc table
CREATE TABLE IF NOT EXISTS YjsDoc (
  groupId TEXT PRIMARY KEY,
  doc TEXT
); 