# UnifyPlan - Real-time Collaborative Planning Platform

UnifyPlan is a modern, real-time collaborative planning application built with Next.js 13+. It enables teams to plan and collaborate in real-time, with features like presence awareness, shared planning boards, and instant updates.

## 🚀 Technology Stack

### Frontend
- **Next.js 13+** - React framework with App Router and Server Components
- **TypeScript** - For type-safe code
- **Tailwind CSS** - For styling and responsive design
- **Headless UI** - For accessible UI components
- **Heroicons** - For consistent iconography

### Backend & Data Layer
- **Prisma** - Type-safe ORM for database operations
- **SQLite/PostgreSQL** - Database (SQLite for development, PostgreSQL for production)
- **Yjs** - CRDT framework for real-time collaboration
- **WebSocket** - For real-time communication via y-websocket
- **Cloudflare Workers** - For edge computing and API routes

### Authentication & Security
- **Next-Auth** - For authentication and session management
- **JWT** - For secure token-based authentication
- **Cookie-based Sessions** - For maintaining user state

## 🏗️ Architecture

### Real-time Collaboration
The application uses a CRDT (Conflict-free Replicated Data Type) based architecture for real-time collaboration:

1. **Yjs Integration**
   - Shared document structure for real-time state
   - Automatic conflict resolution
   - Presence awareness system
   - WebSocket provider for real-time sync

2. **Presence System**
   - User presence tracking with 2-minute timeout
   - 15-second presence update interval
   - Automatic stale user cleanup
   - Real-time user status updates

### Data Flow
```
Client <-> WebSocket <-> Yjs Provider <-> Shared Document <-> Database
```

### State Management
- **Shared State**: Managed through Yjs shared documents
- **Local State**: React hooks and context
- **Persistence**: Prisma ORM with database

## 🔑 Key Features

1. **Real-time Collaboration**
   - Simultaneous editing
   - Presence awareness
   - Instant updates
   - Conflict resolution

2. **Planning Tools**
   - Card-based planning
   - Drag-and-drop interface
   - Reactions and comments
   - Activity feed

3. **Group Management**
   - Group creation and joining
   - Invite system
   - Member management
   - Linked groups

4. **Security**
   - JWT-based authentication
   - Secure WebSocket connections
   - Rate limiting
   - CORS protection

## 🔧 Technical Implementation Details

### Real-time Sync (Yjs)
```typescript
interface PlanningRoomYjsDoc {
  linkedCards: Listing[];
  cardOrder: string[];
  chatMessages: ChatMessage[];
  reactions: Record<string, Record<string, 'like' | 'dislike' | null>>;
  polls: Poll[];
  activityFeed: Activity[];
  presentUsers: PresentUser[];
}
```

### Presence System
```typescript
interface PresentUser {
  id: string;          // User ID
  name?: string;       // Display name
  email?: string;      // Email
  avatar?: string;     // Avatar URL
  lastActive: number;  // Last activity timestamp
  joinedAt: number;    // Session join timestamp
}
```

### API Routes
- `/api/auth/*` - Authentication endpoints
- `/api/planning-room/*` - Planning room operations
- `/api/me/*` - User-specific operations
- `/api/invite/*` - Invitation system

## 🚥 Environment Configuration

Required environment variables:
```env
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## 🔄 Deployment

The application is deployed on Vercel with:
- Edge Functions for API routes
- Serverless Functions for authentication
- WebSocket provider on Railway
- PostgreSQL database on Vercel

## 🛠️ Development Setup

1. Clone the repository
```bash
git clone https://github.com/your-repo/UnifyPlan.git
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Run development server
```bash
npm run dev
```

## 📦 Production Build

```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details 