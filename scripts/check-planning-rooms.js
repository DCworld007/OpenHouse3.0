// This script is designed to check the state of planning rooms in the D1 database
// and help fix issues with missing planning rooms.
// 
// Usage: 
// 1. npx wrangler d1 execute <database-name> --command "SELECT * FROM PlanningRoom" | cat 
// 2. node scripts/check-planning-rooms.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DATABASE_NAME = 'local-openhouse-db';
const ROOM_ID_TO_FIX = '96013c1e-9aaa-469b-9d8c-c4f08fe2adaa';
const USER_ID = '101452305332594244500'; // User ID for room ownership

function runCommand(command) {
  console.log(`Running command: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Error running command: ${error.message}`);
    if (error.stdout) console.error(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

function checkPlanningRooms() {
  console.log('Checking planning rooms in database...');
  
  // Check if ROOM_ID_TO_FIX exists
  const checkCmd = `npx wrangler d1 execute ${DATABASE_NAME} --command "SELECT * FROM PlanningRoom WHERE id = '${ROOM_ID_TO_FIX}'" | cat`;
  const result = runCommand(checkCmd);
  
  if (result.includes('results": []')) {
    console.log(`Planning room with ID ${ROOM_ID_TO_FIX} not found in database. Creating it now...`);
    createPlanningRoom();
  } else {
    console.log(`Planning room with ID ${ROOM_ID_TO_FIX} already exists in database.`);
  }
}

function createPlanningRoom() {
  console.log(`Creating planning room with ID ${ROOM_ID_TO_FIX}...`);
  
  const now = new Date().toISOString();
  const roomName = 'New Group';
  
  // 1. Create the room
  const createRoomCmd = `npx wrangler d1 execute ${DATABASE_NAME} --command "INSERT INTO PlanningRoom (id, name, description, ownerId, createdAt, updatedAt) VALUES ('${ROOM_ID_TO_FIX}', '${roomName}', '', '${USER_ID}', '${now}', '${now}')" | cat`;
  runCommand(createRoomCmd);
  
  // 2. Create room member record
  const memberId = `member-${Date.now()}`;
  const createMemberCmd = `npx wrangler d1 execute ${DATABASE_NAME} --command "INSERT INTO RoomMember (id, roomId, userId, role, createdAt, updatedAt) VALUES ('${memberId}', '${ROOM_ID_TO_FIX}', '${USER_ID}', 'owner', '${now}', '${now}')" | cat`;
  runCommand(createMemberCmd);
  
  // 3. Verify the room was created
  const verifyCmd = `npx wrangler d1 execute ${DATABASE_NAME} --command "SELECT * FROM PlanningRoom WHERE id = '${ROOM_ID_TO_FIX}'" | cat`;
  runCommand(verifyCmd);
  
  console.log('Planning room creation completed. Please restart your server and try generating an invite again.');
}

// Run the script
checkPlanningRooms(); 