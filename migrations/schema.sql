-- Create the User table
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY, 
  email TEXT,
  name TEXT,
  image TEXT,
  createdAt TEXT
);

-- Create the PlanningRoom table
CREATE TABLE IF NOT EXISTS PlanningRoom (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

-- Create the Activity table
CREATE TABLE IF NOT EXISTS Activity (
  id TEXT PRIMARY KEY,
  groupId TEXT NOT NULL,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  context TEXT,
  timestamp INTEGER NOT NULL
);

-- Create the InviteTokens table
CREATE TABLE IF NOT EXISTS InviteTokens (
  token TEXT PRIMARY KEY,
  planningRoomId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  maxUses INTEGER DEFAULT 10,
  usesCount INTEGER DEFAULT 0,
  isActive INTEGER DEFAULT 1
);

-- Create the Card table
CREATE TABLE IF NOT EXISTS Card (
  id TEXT PRIMARY KEY,
  planningRoomId TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL, 
  notes TEXT,
  createdAt TEXT NOT NULL,
  position INTEGER
);

-- Create the PlanningRoomUser table (for room members)
CREATE TABLE IF NOT EXISTS PlanningRoomUser (
  planningRoomId TEXT NOT NULL,
  userId TEXT NOT NULL,
  role TEXT NOT NULL,
  joinedAt TEXT NOT NULL,
  PRIMARY KEY (planningRoomId, userId)
);

-- Create the LinkedGroup table
CREATE TABLE IF NOT EXISTS LinkedGroup (
  sourceGroupId TEXT NOT NULL,
  targetGroupId TEXT NOT NULL,
  linkType TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (sourceGroupId, targetGroupId)
);

-- YjsDoc table
CREATE TABLE IF NOT EXISTS YjsDoc (
  groupId TEXT PRIMARY KEY,
  doc TEXT
); 