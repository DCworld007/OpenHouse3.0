import { useState, Fragment } from 'react';
import { Activity, ActivityType, ActivityDetails } from '@/types/activity';
import { EMOJI_REACTIONS, Message, Poll } from '@/types/message';
import { ListingGroup } from '@/types/listing';
import { 
  ChatBubbleLeftRightIcon, 
  ArrowLeftIcon, 
  FaceSmileIcon, 
  PlusIcon,
  ChartBarIcon,
  DocumentPlusIcon,
  XMarkIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Card from './Card';
import { Switch } from '@headlessui/react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import ActivityFeed from './ActivityFeed';
import PlanCard from './PlanCard';
import { v4 as uuidv4 } from 'uuid';
import { Listing } from '@/types/listing';
import { usePlanningRoomSync } from '@/hooks/planningRoom/usePlanningRoomSync';
import { useUser } from '@/lib/useUser';

interface CustomPoll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, string[]>;
}

interface ExtendedMessage extends Message {
  sender: string;
  reactions: Record<string, string[]>;
}

interface BaseActivityDetails {
  userId: string;
  messageId: string;
  timestamp: number;
}

interface VoteActivity extends BaseActivityDetails {
  type: 'vote';
  pollId: string;
  option: string;
}

interface CustomActivity {
  timestamp: number;
  userId: string;
  messageId: string;
}

interface CustomPollActivity extends CustomActivity {
  type: 'poll';
  question: string;
  options: string[];
  pollIndex: number;
}

interface CustomReactionActivity extends CustomActivity {
  type: 'reaction';
  listingId: string;
  reactionType: 'thumbsUp' | 'thumbsDown';
}

interface PlanningRoomProps {
  group: ListingGroup;
  onGroupUpdate: (group: ListingGroup) => void;
}

export default function PlanningRoom({ group, onGroupUpdate }: PlanningRoomProps) {
  // Use Yjs-powered planningRoom for real-time card sync
  const { user } = useUser();
  const userId = user?.id || '';
  const planningRoom = usePlanningRoomSync(group.id, userId);
  // Use Yjs-powered chat messages
  const messages = planningRoom.chatMessages;
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardNotes, setNewCardNotes] = useState('');
  const [cardType, setCardType] = useState<'what' | 'where'>('what');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [polls, setPolls] = useState<CustomPoll[]>([]);

  // Map Yjs cardOrder to linkedCards for display, filter out undefined
  const cards = planningRoom.cardOrder
    .map((cardId: string) => planningRoom.linkedCards.find((card: any) => card.id === cardId))
    .filter((card: any): card is NonNullable<typeof card> => Boolean(card));
  // Add debug logging in the component render
  console.log('Rendering Yjs cards:', cards.map(c => c.id));

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    planningRoom.addChatMessage({
      id: uuidv4(),
      userId,
      text: newMessage,
      timestamp: Date.now(),
    });
    setNewMessage('');
  };

  const handleCreatePoll = (question: string, options: string[]) => {
    const pollId = uuidv4();
    const messageId = uuidv4();
    const newPoll: Poll = {
      id: pollId,
      question,
      options,
      votes: {},
    };

    // Add the message to chat (Yjs-powered, only text messages for now)
    planningRoom.addChatMessage({
      id: uuidv4(),
      userId,
      text: question, // For poll creation, just store the question as text for now
      timestamp: Date.now(),
    });
    
    // Add activity
    addActivity('poll_create', {
      pollQuestion: question,
      timestamp: Date.now()
    });

    // Reset and close modal
    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPollCreator(false);
  };

  // Poll voting not yet supported in Yjs chat
  // (removed legacy updatePollVotes logic)

  // Reactions not yet supported in Yjs chat
  // (removed legacy updateReaction logic)

  const handleAddCard = (type: 'what' | 'where', content: string, notes?: string) => {
    const newCard = {
      id: uuidv4(),
      content,
      notes: notes || '',
      cardType: type,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    planningRoom.addCard(newCard);
    // Optimistically close modal and reset fields immediately
    setShowNewCardForm(false);
    setShowActionsMenu(false);
    setNewCardContent('');
    setNewCardNotes('');
  };

  const handleCreateNewCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardContent.trim()) return;
    handleAddCard(cardType, newCardContent, newCardNotes);
    // All resets are now handled in handleAddCard for instant feedback
  };

  const addActivity = (type: ActivityType, details: ActivityDetails) => {
    const activity: Activity = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      userId: 'currentUser', // Replace with actual user ID when auth is implemented
      details
    };
    setActivities(prev => [...prev, activity]);
  };

  const handleCardReaction = (cardId: string, reactionType: 'thumbsUp' | 'thumbsDown') => {
    const userId = 'currentUser'; // Replace with actual user ID
    
    const updatedGroup = { ...group };
    const updatedListings = updatedGroup.listings.map(listing => {
      if (listing.id === cardId) {
        const reactions = listing.reactions || [];
        const existingReactionIndex = reactions.findIndex(
          r => r.type === reactionType && r.userId === userId
        );

        let updatedReactions = [...reactions];
        if (existingReactionIndex >= 0) {
          updatedReactions.splice(existingReactionIndex, 1);
        } else {
          updatedReactions.push({ type: reactionType, userId });
          // Add activity only when adding a reaction, not when removing
          addActivity('card_reaction', {
            cardTitle: listing.address,
            reactionType,
            timestamp: Date.now()
          });
        }

        return {
          ...listing,
          reactions: updatedReactions
        };
      }
      return listing;
    });

    updatedGroup.listings = updatedListings;
    onGroupUpdate(updatedGroup);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex((item) => item && item.id === active.id);
    const newIndex = cards.findIndex((item) => item && item.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = Array.from(planningRoom.cardOrder);
      const [moved] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, moved);
      planningRoom.reorderCards(newOrder);
      // Add activity (optional, if you want to keep this feature)
      // addActivity('card_reorder', { ... });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/plans" className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">{group.name}</h1>
              <span className="px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">Planning Room</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Cards */}
          <div className="col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
                  <button
                    onClick={() => setShowNewCardForm(true)}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-indigo-50"
                    title="Add new card"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {cards.map((card, index) => (
                        card ? (
                          <SortableCard
                            key={card.id}
                            card={card}
                            index={index}
                            setActiveCardId={setActiveCardId}
                            setShowNewCardForm={setShowNewCardForm}
                            planningRoom={planningRoom}
                            userId={userId}
                          />
                        ) : null
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>

          {/* Middle Column - Chat */}
          <div className="col-span-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-lg font-semibold flex items-center text-gray-900">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Group Chat
                </h2>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="group relative">
                    <div className="flex flex-col rounded-xl p-3 bg-white border border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-700">
                            {message.userId?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{message.userId}</span>
                          <span className="ml-2 text-sm text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-gray-700">{message.text}</p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No messages yet. Start the conversation!
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                    
                    {showActionsMenu && (
                      <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-10">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPollCreator(true);
                            setShowActionsMenu(false);
                          }}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <ChartBarIcon className="h-5 w-5 mr-3 text-gray-400" />
                          Create Poll
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCardForm(true);
                            setShowActionsMenu(false);
                          }}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <DocumentPlusIcon className="h-5 w-5 mr-3 text-gray-400" />
                          Add New Card
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border-0 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 text-sm py-3 px-4"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column - Activity Feed */}
          <div className="col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
              </div>
              <div className="h-[550px] overflow-y-auto">
                <ActivityFeed activities={activities.slice().reverse()} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPollCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[480px] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Create a Poll</h3>
              <button
                type="button"
                onClick={() => setShowPollCreator(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) return;
                
                handleCreatePoll(pollQuestion, pollOptions.filter(opt => opt.trim()));
                setPollQuestion('');
                setPollOptions(['', '']);
                setShowPollCreator(false);
              }} className="space-y-6">
                <div>
                  <label htmlFor="pollQuestion" className="block text-sm font-medium text-gray-700">
                    Question
                  </label>
                  <input
                    type="text"
                    id="pollQuestion"
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 px-4"
                  />
                </div>

                <div className="space-y-3">
                  {pollOptions.map((option, index) => (
                    <input
                      key={index}
                      type="text"
                      value={option}
                      onChange={e => {
                        const newOptions = [...pollOptions];
                        newOptions[index] = e.target.value;
                        setPollOptions(newOptions);
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 px-4"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    + Add Option
                  </button>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPollQuestion('');
                      setPollOptions(['', '']);
                      setShowPollCreator(false);
                    }}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Poll
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showNewCardForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[480px] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Add New Card</h3>
              <div className="flex items-center gap-x-3">
                <span className={`text-sm ${cardType === 'what' ? 'text-gray-900' : 'text-gray-500'}`}>What</span>
                <Switch
                  checked={cardType === 'where'}
                  onChange={() => setCardType(cardType === 'where' ? 'what' : 'where')}
                  className={`${
                    cardType === 'where' ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      cardType === 'where' ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <span className={`text-sm ${cardType === 'where' ? 'text-gray-900' : 'text-gray-500'}`}>Where</span>
              </div>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleCreateNewCard} className="space-y-6">
                <div>
                  <label htmlFor="cardContent" className="block text-sm font-medium text-gray-700">
                    {cardType === 'where' ? 'Where' : 'What'}
                  </label>
                  <textarea
                    id="cardContent"
                    value={newCardContent}
                    onChange={e => setNewCardContent(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border-0 py-2 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                    placeholder={cardType === 'where' ? 'Enter location or address' : 'Enter what you want to do'}
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    id="notes"
                    value={newCardNotes}
                    onChange={e => setNewCardNotes(e.target.value)}
                    className="mt-1 w-full rounded-md border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                    placeholder="Add any additional notes here"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCardForm(false);
                      setShowActionsMenu(false);
                      setNewCardContent('');
                      setNewCardNotes('');
                    }}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newCardContent.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Card
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add SortableCard component for @dnd-kit
function SortableCard({ card, index, setActiveCardId, setShowNewCardForm, planningRoom, userId }: any) {
  const reactions = planningRoom.reactions?.[card.id] || {};
  const userReaction = reactions[userId] || null;
  const likeCount = Object.values(reactions).filter(r => r === 'like').length;
  const dislikeCount = Object.values(reactions).filter(r => r === 'dislike').length;

  // Debug logging
  console.log('SortableCard', card.id, { reactions, userReaction, likeCount, dislikeCount });

  const handleReaction = (type: 'like' | 'dislike') => {
    if (userReaction === type) {
      planningRoom.removeReaction(card.id);
    } else {
      planningRoom.addReaction(card.id, type);
    }
  };

  // Show reactions on hover if no reactions and user hasn't reacted, otherwise always show
  const showReactionsAlways = likeCount > 0 || dislikeCount > 0 || userReaction;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className={`transition-all group ${isDragging ? 'opacity-50' : ''}`} {...attributes}>
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-5 flex items-center hover:border-indigo-300 transition-colors shadow-sm relative group">
        {/* Drag Handle - only this is draggable */}
        <button
          className="mr-3 p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing"
          tabIndex={0}
          aria-label="Drag to reorder"
          type="button"
          {...listeners}
        >
          <Bars3Icon className="h-5 w-5 text-gray-600" />
        </button>
        {/* Card Content */}
        <div className="flex-1">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                {card.cardType === 'where' ? 'Where' : 'What'}
              </div>
              <div className="text-sm text-gray-900">{card.content}</div>
            </div>
            {card.notes && (
              <div className="pt-2 border-t">
                <div className="text-sm text-gray-600 leading-relaxed">{card.notes}</div>
              </div>
            )}
          </div>
        </div>
        {/* Reactions - right, show on hover if no reactions, always if there are reactions or user has reacted */}
        <div className={`flex items-center gap-1 ml-2 ${showReactionsAlways ? '' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity'}`}>
          <button
            onClick={() => handleReaction('like')}
            className={`p-1.5 rounded-full transition-colors flex items-center gap-1 text-base font-medium
              ${userReaction === 'like' ? 'bg-blue-100 text-blue-600 font-bold shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            title="Like"
          >
            👍 <span className="ml-1 text-xs">{likeCount}</span>
          </button>
          <button
            onClick={() => handleReaction('dislike')}
            className={`p-1.5 rounded-full transition-colors flex items-center gap-1 text-base font-medium
              ${userReaction === 'dislike' ? 'bg-red-100 text-red-600 font-bold shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            title="Dislike"
          >
            👎 <span className="ml-1 text-xs">{dislikeCount}</span>
          </button>
        </div>
        {/* Plus Button - bottom center, half on/half off, only on hover */}
        <button
          onClick={() => {
            setActiveCardId(card.id);
            setShowNewCardForm(true);
          }}
          className="absolute left-1/2 bottom-0 translate-x-[-50%] translate-y-1/2 z-10 transition-all duration-200 rounded-full bg-white border border-gray-200 p-2 hover:bg-indigo-50 hover:border-indigo-200 hover:scale-110 shadow-lg opacity-0 group-hover:opacity-100"
          title="Add card"
        >
          <PlusIcon className="w-5 h-5 text-indigo-600" />
        </button>
      </div>
    </div>
  );
} 