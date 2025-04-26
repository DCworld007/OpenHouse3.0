import { verifyToken } from '@/lib/cloudflare-jwt';
import { corsHeaders } from './cors-headers';

// Define the Env interface with proper types
interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

// Define types for database results
interface D1Result<T> {
  results: T[];
  success: boolean;
  meta: any;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface Reaction {
  id: string;
  type: string;
  userId: string;
  messageId?: string;
  cardId?: string;
  createdAt: string;
  user?: User;
  // Additional properties from SQL joins
  userName?: string | null;
  userEmail?: string;
  userImage?: string | null;
}

interface RoomMember {
  id: string;
  userId: string;
  roomId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  // Additional properties from SQL joins
  userName?: string | null;
  userEmail?: string;
  userImage?: string | null;
}

interface Card {
  id: string;
  content: string;
  notes: string | null;
  cardType: string;
  imageUrl: string | null;
  groupId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  // Additional properties from SQL joins
  userName?: string | null;
  userEmail?: string;
  userImage?: string | null;
  user?: User;
  reactions?: Reaction[];
}

interface Room {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  // Additional properties from SQL joins
  ownerName?: string | null;
  ownerEmail?: string;
  ownerImage?: string | null;
  owner?: User;
  members?: RoomMember[];
}

interface Message {
  id: string;
  content: string;
  userId: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
  // Additional properties from SQL joins
  userName?: string | null;
  userEmail?: string;
  userImage?: string | null;
  user?: User;
  reactions?: Reaction[];
}

async function verifyAuth(request: Request, env: Env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token, env.JWT_SECRET);
  return payload;
}

async function handleCards(request: Request, env: Env) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId');
  const cardId = url.searchParams.get('cardId');
  const userId = url.searchParams.get('userId');

  switch (request.method) {
    case 'GET': {
      if (!roomId) {
        return new Response('Room ID is required', { status: 400 });
      }

      // Get cards linked to the room
      const cardsStmt = env.DB.prepare(`
        SELECT c.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
        FROM Card c
        JOIN CardRoomLink crl ON c.id = crl.cardId
        LEFT JOIN User u ON c.userId = u.id
        WHERE crl.roomId = ?
      `);
      const cardsResult = await cardsStmt.bind(roomId).all() as D1Result<Card>;
      const cards = cardsResult.results.map((card: any) => ({
        id: card.id,
        type: card.type,
        content: card.content,
        user: {
          id: card.userId || null,
          name: card.userName || null,
          avatar: card.userAvatar || null,
        },
        owner: {
          id: card.ownerId || null,
          name: card.ownerName || null,
          avatar: card.ownerAvatar || null,
        },
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        reactions: [] as Reaction[]
      }));

      // Get reactions for these cards
      const cardIds = cards.map((card) => card.id);
      let reactions: Reaction[] = [];
      
      if (cardIds.length > 0) {
        const placeholders = cardIds.map(() => '?').join(',');
        const reactionsStmt = env.DB.prepare(`
          SELECT r.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
          FROM Reaction r
          LEFT JOIN User u ON r.userId = u.id
          WHERE r.cardId IN (${placeholders})
        `);
        const reactionsResult = await reactionsStmt.bind(...cardIds).all() as D1Result<Reaction>;
        reactions = reactionsResult.results || [];
      }

      // Combine cards with their reactions
      const cardsWithReactions = cards.map((card) => {
        card.reactions = reactions.filter((r) => r.cardId === card.id);
        return card;
      });

      return new Response(JSON.stringify(cardsWithReactions), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'POST': {
      if (!roomId || !userId) {
        return new Response('Room ID and User ID are required', { status: 400 });
      }

      const body = await request.json();
      const { content, notes, cardType, imageUrl, groupId } = body;

      if (!content) {
        return new Response('Content is required', { status: 400 });
      }

      // Create card
      const cardId = crypto.randomUUID();
      const now = new Date().toISOString();
      const insertCardStmt = env.DB.prepare(`
        INSERT INTO Card (id, content, notes, cardType, imageUrl, groupId, userId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      await insertCardStmt.bind(
        cardId,
        content,
        notes || null,
        cardType || 'what',
        imageUrl || null,
        groupId || null,
        userId,
        now,
        now
      ).run();

      // Create room link
      const insertLinkStmt = env.DB.prepare(`
        INSERT INTO CardRoomLink (cardId, roomId)
        VALUES (?, ?)
      `);
      await insertLinkStmt.bind(cardId, roomId).run();

      // Fetch the created card with user and reactions
      const cardStmt = env.DB.prepare(`
        SELECT c.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
        FROM Card c
        LEFT JOIN User u ON c.userId = u.id
        WHERE c.id = ?
      `);
      const cardResult = await cardStmt.bind(cardId).first() as Card;
      
      if (!cardResult) {
        return new Response('Failed to create card', { status: 500 });
      }

      // Format the response
      const card = {
        ...cardResult,
        user: {
          id: cardResult.userId,
          name: (cardResult.userName as string | null) || null,
          email: (cardResult.userEmail as string | null) || null,
          image: (cardResult.userImage as string | null) || null
        },
        reactions: [] as Reaction[]
      };

      return new Response(JSON.stringify(card), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'PUT': {
      if (!cardId || !userId) {
        return new Response('Card ID and User ID are required', { status: 400 });
      }

      const body = await request.json();
      const { content, notes, cardType, imageUrl, groupId } = body;

      // Build update query dynamically
      let updateFields = [];
      let updateValues = [];
      
      if (content !== undefined) {
        updateFields.push('content = ?');
        updateValues.push(content);
      }
      if (notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(notes);
      }
      if (cardType !== undefined) {
        updateFields.push('cardType = ?');
        updateValues.push(cardType);
      }
      if (imageUrl !== undefined) {
        updateFields.push('imageUrl = ?');
        updateValues.push(imageUrl);
      }
      if (groupId !== undefined) {
        updateFields.push('groupId = ?');
        updateValues.push(groupId);
      }
      
      // Add updatedAt timestamp
      updateFields.push('updatedAt = ?');
      updateValues.push(new Date().toISOString());
      
      // Add id and userId for WHERE clause
      updateValues.push(cardId);
      updateValues.push(userId);

      if (updateFields.length === 0) {
        return new Response('No fields to update', { status: 400 });
      }

      const updateStmt = env.DB.prepare(`
        UPDATE Card
        SET ${updateFields.join(', ')}
        WHERE id = ? AND userId = ?
      `);
      await updateStmt.bind(...updateValues).run();

      // Fetch the updated card with user and reactions
      const cardStmt = env.DB.prepare(`
        SELECT c.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
        FROM Card c
        LEFT JOIN User u ON c.userId = u.id
        WHERE c.id = ?
      `);
      const cardResult = await cardStmt.bind(cardId).first() as Card;
      
      if (!cardResult) {
        return new Response('Card not found', { status: 404 });
      }

      // Get reactions
      const reactionsStmt = env.DB.prepare(`
        SELECT r.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
        FROM Reaction r
        LEFT JOIN User u ON r.userId = u.id
        WHERE r.cardId = ?
      `);
      const reactionsResult = await reactionsStmt.bind(cardId).all() as D1Result<Reaction>;
      const reactions = reactionsResult.results || [];

      // Format the response
      const card = {
        ...cardResult,
        user: {
          id: cardResult.userId,
          name: (cardResult.userName as string | null) || null,
          email: (cardResult.userEmail as string | null) || null,
          image: (cardResult.userImage as string | null) === undefined ? null : cardResult.userImage
        },
        reactions: reactions.map((r) => ({
          ...r,
          user: {
            id: r.userId,
            name: (r.userName as string | null) === undefined ? null : r.userName,
            email: (r.userEmail as string | null) === undefined ? null : r.userEmail,
            image: (r.userImage as string | null) === undefined ? null : r.userImage
          }
        })) as Reaction[]
      };

      return new Response(JSON.stringify(card), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'DELETE': {
      if (!cardId || !userId) {
        return new Response('Card ID and User ID are required', { status: 400 });
      }

      // Delete card (this should cascade to CardRoomLink and reactions)
      const deleteStmt = env.DB.prepare(`
        DELETE FROM Card
        WHERE id = ? AND userId = ?
      `);
      await deleteStmt.bind(cardId, userId).run();

      return new Response(null, { status: 204 });
    }

    default:
      return new Response('Method not allowed', { status: 405 });
  }
}

async function handleRooms(request: Request, env: Env) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId');
  const userId = url.searchParams.get('userId');

  switch (request.method) {
    case 'GET': {
      if (!userId) {
        return new Response('User ID is required', { status: 400 });
      }

      // Get rooms where user is owner or member
      const roomsStmt = env.DB.prepare(`
        SELECT r.*, u.id as ownerId, u.name as ownerName, u.email as ownerEmail, u.image as ownerImage
        FROM PlanningRoom r
        LEFT JOIN User u ON r.ownerId = u.id
        WHERE r.ownerId = ?
        UNION
        SELECT r.*, u.id as ownerId, u.name as ownerName, u.email as ownerEmail, u.image as ownerImage
        FROM PlanningRoom r
        JOIN RoomMember rm ON r.id = rm.roomId
        LEFT JOIN User u ON r.ownerId = u.id
        WHERE rm.userId = ?
      `);
      const roomsResult = await roomsStmt.bind(userId, userId).all() as D1Result<Room>;
      const rooms = roomsResult.results.map((room: any) => ({
        id: room.id,
        name: room.name,
        description: room.description,
        user: {
          id: room.userId || null,
          name: room.userName || null,
          avatar: room.userAvatar || null,
        },
        owner: {
          id: room.ownerId || null,
          name: room.ownerName || null,
          avatar: room.ownerAvatar || null,
        },
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        members: [] as RoomMember[]
      }));

      // Get members for each room
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        const membersStmt = env.DB.prepare(`
          SELECT rm.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
          FROM RoomMember rm
          LEFT JOIN User u ON rm.userId = u.id
          WHERE rm.roomId = ?
        `);
        const membersResult = await membersStmt.bind(room.id).all() as D1Result<RoomMember>;
        room.members = membersResult.results.map((m) => ({
          ...m,
          user: {
            id: m.userId || null,
            name: m.userName || null,
            email: m.userEmail || null,
            image: m.userImage || null
          }
        })) as RoomMember[];
      }

      return new Response(JSON.stringify(rooms), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'POST': {
      if (!userId) {
        return new Response('User ID is required', { status: 400 });
      }

      const body = await request.json();
      const { name, description } = body;

      if (!name) {
        return new Response('Room name is required', { status: 400 });
      }

      // Create room
      const roomId = crypto.randomUUID();
      const now = new Date().toISOString();
      const insertRoomStmt = env.DB.prepare(`
        INSERT INTO PlanningRoom (id, name, description, ownerId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      await insertRoomStmt.bind(
        roomId,
        name,
        description || null,
        userId,
        now,
        now
      ).run();

      // Add user as owner member
      const insertMemberStmt = env.DB.prepare(`
        INSERT INTO RoomMember (roomId, userId, role, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      await insertMemberStmt.bind(
        roomId,
        userId,
        'owner',
        now,
        now
      ).run();

      // Fetch the created room with owner and members
      const roomStmt = env.DB.prepare(`
        SELECT r.*, u.id as ownerId, u.name as ownerName, u.email as ownerEmail, u.image as ownerImage
        FROM PlanningRoom r
        LEFT JOIN User u ON r.ownerId = u.id
        WHERE r.id = ?
      `);
      const roomResult = await roomStmt.bind(roomId).first() as Room;
      
      if (!roomResult) {
        return new Response('Failed to create room', { status: 500 });
      }

      // Get members
      const membersStmt = env.DB.prepare(`
        SELECT rm.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
        FROM RoomMember rm
        LEFT JOIN User u ON rm.userId = u.id
        WHERE rm.roomId = ?
      `);
      const membersResult = await membersStmt.bind(roomId).all() as D1Result<RoomMember>;
      const members = membersResult.results.map((m) => ({
        ...m,
        user: {
          id: m.userId || null,
          name: m.userName || null,
          email: m.userEmail || null,
          image: m.userImage || null
        }
      })) as RoomMember[];

      // Format the response
      const room = {
        ...roomResult,
        owner: {
          id: roomResult.ownerId,
          name: (roomResult.ownerName as string | null) || null,
          email: (roomResult.ownerEmail as string | null) || null,
          image: (roomResult.ownerImage as string | null) || null
        },
        members
      };

      return new Response(JSON.stringify(room), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'PUT': {
      if (!roomId || !userId) {
        return new Response('Room ID and User ID are required', { status: 400 });
      }

      const body = await request.json();
      const { name, description } = body;

      // Build update query dynamically
      let updateFields = [];
      let updateValues = [];
      
      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      
      // Add updatedAt timestamp
      updateFields.push('updatedAt = ?');
      updateValues.push(new Date().toISOString());
      
      // Add id and ownerId for WHERE clause
      updateValues.push(roomId);
      updateValues.push(userId);

      if (updateFields.length === 0) {
        return new Response('No fields to update', { status: 400 });
      }

      const updateStmt = env.DB.prepare(`
        UPDATE PlanningRoom
        SET ${updateFields.join(', ')}
        WHERE id = ? AND ownerId = ?
      `);
      await updateStmt.bind(...updateValues).run();

      // Fetch the updated room with owner and members
      const roomStmt = env.DB.prepare(`
        SELECT r.*, u.id as ownerId, u.name as ownerName, u.email as ownerEmail, u.image as ownerImage
        FROM PlanningRoom r
        LEFT JOIN User u ON r.ownerId = u.id
        WHERE r.id = ?
      `);
      const roomResult = await roomStmt.bind(roomId).first() as Room;
      
      if (!roomResult) {
        return new Response('Room not found', { status: 404 });
      }

      // Get members
      const membersStmt = env.DB.prepare(`
        SELECT rm.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
        FROM RoomMember rm
        LEFT JOIN User u ON rm.userId = u.id
        WHERE rm.roomId = ?
      `);
      const membersResult = await membersStmt.bind(roomId).all() as D1Result<RoomMember>;
      const members = membersResult.results.map((m) => ({
        ...m,
        user: {
          id: m.userId || null,
          name: m.userName || null,
          email: m.userEmail || null,
          image: m.userImage || null
        }
      })) as RoomMember[];

      // Format the response
      const room = {
        ...roomResult,
        owner: {
          id: roomResult.ownerId,
          name: (roomResult.ownerName as string | null) || null,
          email: (roomResult.ownerEmail as string | null) || null,
          image: (roomResult.ownerImage as string | null) || null
        },
        members
      };

      return new Response(JSON.stringify(room), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'DELETE': {
      if (!roomId || !userId) {
        return new Response('Room ID and User ID are required', { status: 400 });
      }

      // Delete room (this should cascade to RoomMember and other related tables)
      const deleteStmt = env.DB.prepare(`
        DELETE FROM PlanningRoom
        WHERE id = ? AND ownerId = ?
      `);
      await deleteStmt.bind(roomId, userId).run();

      return new Response(null, { status: 204 });
    }

    default:
      return new Response('Method not allowed', { status: 405 });
  }
}

async function handleMessages(request: Request, env: Env) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId');
  const messageId = url.searchParams.get('messageId');
  const userId = url.searchParams.get('userId');

  switch (request.method) {
    case 'GET': {
      if (!roomId) {
        return new Response('Room ID is required', { status: 400 });
      }

      // Get messages with user and reactions
      const messagesStmt = env.DB.prepare(`
        SELECT m.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
        FROM Message m
        LEFT JOIN User u ON m.userId = u.id
        WHERE m.roomId = ?
        ORDER BY m.createdAt DESC
      `);
      const messagesResult = await messagesStmt.bind(roomId).all() as D1Result<Message>;
      const messages = messagesResult.results.map((message: any) => ({
        id: message.id,
        content: message.content,
        user: {
          id: message.userId || null,
          name: message.userName || null,
          avatar: message.userAvatar || null,
        },
        owner: {
          id: message.ownerId || null,
          name: message.ownerName || null,
          avatar: message.ownerAvatar || null,
        },
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        reactions: [] as Reaction[]
      }));

      // Get reactions for these messages
      const messageIds = messages.map((m) => m.id);
      let reactions: Reaction[] = [];
      
      if (messageIds.length > 0) {
        const placeholders = messageIds.map(() => '?').join(',');
        const reactionsStmt = env.DB.prepare(`
          SELECT r.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
          FROM Reaction r
          LEFT JOIN User u ON r.userId = u.id
          WHERE r.messageId IN (${placeholders})
        `);
        const reactionsResult = await reactionsStmt.bind(...messageIds).all() as D1Result<any>;
        reactions = reactionsResult.results || [];
      }

      // Combine messages with their reactions
      const messagesWithReactions = messages.map((message) => {
        message.reactions = reactions.filter((r) => r.messageId === message.id);
        return message;
      });

      return new Response(JSON.stringify(messagesWithReactions), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'POST': {
      if (!roomId || !userId) {
        return new Response('Room ID and User ID are required', { status: 400 });
      }

      const body = await request.json();
      const { content } = body;

      if (!content) {
        return new Response('Content is required', { status: 400 });
      }

      // Create message
      const messageId = crypto.randomUUID();
      const now = new Date().toISOString();
      const insertStmt = env.DB.prepare(`
        INSERT INTO Message (id, content, userId, roomId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      await insertStmt.bind(
        messageId,
        content,
        userId,
        roomId,
        now,
        now
      ).run();

      // Fetch the created message with user and reactions
      const messageStmt = env.DB.prepare(`
        SELECT m.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
        FROM Message m
        LEFT JOIN User u ON m.userId = u.id
        WHERE m.id = ?
      `);
      const messageResult = await messageStmt.bind(messageId).first() as Message;
      
      if (!messageResult) {
        return new Response('Failed to create message', { status: 500 });
      }

      // Format the response
      const message = {
        ...messageResult,
        user: {
          id: messageResult.userId,
          name: (messageResult.userName as string | null) || null,
          email: (messageResult.userEmail as string | null) || null,
          image: (messageResult.userImage as string | null) || null
        },
        reactions: []
      };

      return new Response(JSON.stringify(message), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'PUT': {
      if (!messageId || !userId) {
        return new Response('Message ID and User ID are required', { status: 400 });
      }

      const body = await request.json();
      const { content } = body;

      if (!content) {
        return new Response('Content is required', { status: 400 });
      }

      // Update message
      const now = new Date().toISOString();
      const updateStmt = env.DB.prepare(`
        UPDATE Message
        SET content = ?, updatedAt = ?
        WHERE id = ? AND userId = ?
      `);
      await updateStmt.bind(content, now, messageId, userId).run();

      // Fetch the updated message with user and reactions
      const messageStmt = env.DB.prepare(`
        SELECT m.*, u.id as userId, u.name as userName, u.email as userEmail, u.image as userImage
        FROM Message m
        LEFT JOIN User u ON m.userId = u.id
        WHERE m.id = ?
      `);
      const messageResult = await messageStmt.bind(messageId).first() as Message;
      
      if (!messageResult) {
        return new Response('Message not found', { status: 404 });
      }

      // Format the response
      const message = {
        ...messageResult,
        user: {
          id: messageResult.userId,
          name: (messageResult.userName as string | null) || null,
          email: (messageResult.userEmail as string | null) || null,
          image: (messageResult.userImage as string | null) || null
        },
        reactions: []
      };

      return new Response(JSON.stringify(message), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'DELETE': {
      if (!messageId || !userId) {
        return new Response('Message ID and User ID are required', { status: 400 });
      }

      // Delete message (this should cascade to Reaction)
      const deleteStmt = env.DB.prepare(`
        DELETE FROM Message
        WHERE id = ? AND userId = ?
      `);
      await deleteStmt.bind(messageId, userId).run();

      return new Response(null, { status: 204 });
    }

    default:
      return new Response('Method not allowed', { status: 405 });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route to appropriate handler based on path
    if (path.startsWith('/api/cards')) {
      return handleCards(request, env);
    } else if (path.startsWith('/api/rooms')) {
      return handleRooms(request, env);
    } else if (path.startsWith('/api/messages')) {
      return handleMessages(request, env);
    }

    // Default response for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  },
};