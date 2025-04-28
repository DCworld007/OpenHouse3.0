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
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import ActivityFeed from './ActivityFeed';
import PlanCard from './PlanCard';
import { v4 as uuidv4 } from 'uuid';
import { Listing } from '@/types/listing';
import type { DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';

// @ts-ignore: No type definitions for react-beautiful-dnd in this project

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
  const [currentGroup, setCurrentGroup] = useState<ListingGroup>(group);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
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

  // Ensure group.listings exists
  if (!group.listings) {
    group.listings = [];
  }

  // Add debug logging in the component render
  console.log('Rendering listings:', currentGroup.listings.map(c => c.id));

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: ExtendedMessage = {
      id: uuidv4(),
      content: newMessage,
      type: 'text',
      timestamp: Date.now(),
      sender: 'currentUser',
      reactions: {}
    };

    setMessages(prev => [...prev, message]);
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

    // Create a new message with the poll
    const message: ExtendedMessage = {
      id: messageId,
      type: 'poll',
      content: '',
      poll: newPoll,
      timestamp: Date.now(),
      sender: 'currentUser',
      reactions: {}
    };

    // Add the message to chat
    setMessages(prev => [...prev, message]);
    
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

  const handleVote = (messageId: string, option: string, pollId: string) => {
    // Update the poll votes in the message
    setMessages(prev => prev.map(message => {
      if (message.id === messageId && message.poll) {
        const votes = message.poll.votes ? { ...message.poll.votes } : {};
        const userId = 'currentUser';
        
        // Remove user's previous vote if any
        Object.keys(votes).forEach(opt => {
          votes[opt] = votes[opt]?.filter(id => id !== userId) || [];
        });
        
        // Add new vote
        votes[option] = [...(votes[option] || []), userId];

        return {
          ...message,
          poll: {
            ...message.poll,
            votes
          }
        };
      }
      return message;
    }));

    // Add activity
    addActivity('poll_vote', {
      pollOption: option,
      timestamp: Date.now()
    });
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(messages.map(message => {
      if (message.id === messageId) {
        const reactions = { ...message.reactions };
        const currentReactions = reactions[emoji] || [];
        const userId = 'currentUser'; // Replace with actual user ID when auth is implemented
        reactions[emoji] = currentReactions.includes(userId)
          ? currentReactions.filter((id: string) => id !== userId)
          : [...currentReactions, userId];
        return {
          ...message,
          reactions,
        };
      }
      return message;
    }));
    setShowEmojiPicker(null);
  };

  const handleCreateNewCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardContent.trim()) return;

    const newCard: Listing = {
      id: uuidv4(),
      address: newCardContent,
      cardType,
      groupId: group.id,
      imageUrl: cardType === 'where' ? '/marker-icon-2x.png' : '/placeholder-activity.jpg',
      sourceUrl: '',
      source: 'manual',
      price: 0,
      notes: newCardNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: group.listings.length,
      reactions: []
    };

    // Update group with new card
    const updatedGroup = {
      ...group,
      listings: [...group.listings, newCard]
    };
    onGroupUpdate(updatedGroup);
    
    // Add card creation activity
    addActivity('card_add', {
      cardTitle: newCardContent,
      timestamp: Date.now()
    });

    // Reset form state
    setNewCardContent('');
    setNewCardNotes('');
    setShowNewCardForm(false);
    setShowActionsMenu(false);
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
    
    const updatedGroup = { ...currentGroup };
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
    setCurrentGroup(updatedGroup);
    onGroupUpdate(updatedGroup);
  };

  const onDragEnd = (result: DropResult) => {
    console.log('onDragEnd', result, currentGroup.listings.map(c => c.id));
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    const updatedListings = Array.from(currentGroup.listings);
    const [removed] = updatedListings.splice(sourceIndex, 1);
    updatedListings.splice(destinationIndex, 0, removed);
    // Update order property for all affected cards
    const reorderedListings = updatedListings.map((listing, index) => ({
      ...listing,
      order: index
    }));
    const updatedGroup = {
      ...currentGroup,
      listings: reorderedListings
    };
    setCurrentGroup(updatedGroup);
    onGroupUpdate(updatedGroup);
    // Add activity
    addActivity('card_reorder', {
      cardTitle: removed.address,
      fromIndex: sourceIndex,
      toIndex: destinationIndex,
      timestamp: Date.now()
    });
  };

  const handleAddCard = (type: 'what' | 'where', content: string, notes?: string) => {
    if (!group) return;

    const newListing: Listing = {
      id: uuidv4(),
      address: content,
      cardType: type,
      groupId: group.id,
      imageUrl: type === 'where' ? '/marker-icon-2x.png' : '/placeholder-activity.jpg',
      sourceUrl: '',
      source: 'manual',
      price: 0,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: group.listings.length,
      reactions: []
    };

    const updatedGroup = {
      ...group,
      listings: [...group.listings, newListing]
    };

    onGroupUpdate(updatedGroup);
  };

  const updateGroup = (newListings: Listing[]) => {
    setCurrentGroup((prevGroup: ListingGroup): ListingGroup => ({
      ...prevGroup,
      listings: newListings
    }));
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
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="cards" direction="vertical" isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>
                    {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-4"
                      >
                        {currentGroup.listings.map((card, index) => (
                          <Draggable key={card.id.toString()} draggableId={card.id.toString()} index={index}>
                            {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`transition-all group ${snapshot.isDragging ? 'opacity-50' : ''}`}
                              >
                                <div className="bg-white rounded-lg border border-gray-200 px-4 py-5 flex items-center hover:border-indigo-300 transition-colors shadow-sm relative group">
                                  {/* Drag Handle - always visible, left */}
                                  <button
                                {...provided.dragHandleProps}
                                    className="mr-3 p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing"
                                    tabIndex={0}
                                    aria-label="Drag to reorder"
                                    type="button"
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
                                      <div className="text-sm text-gray-900">{card.address}</div>
                                    </div>
                                    {card.notes && (
                                      <div className="pt-2 border-t">
                                        <div className="text-sm text-gray-600 leading-relaxed">{card.notes}</div>
                                      </div>
                                    )}
                                          </div>
                                          </div>
                                  {/* Reactions - right, only on hover/focus */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-2">
                                  <button
                                    onClick={() => handleCardReaction(card.id, 'thumbsUp')}
                                    className={`p-1.5 rounded-full transition-colors ${
                                      card.reactions?.some(r => r.type === 'thumbsUp' && r.userId === 'currentUser')
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                    title="Like"
                                  >
                                    👍
                                  </button>
                                  <button
                                    onClick={() => handleCardReaction(card.id, 'thumbsDown')}
                                    className={`p-1.5 rounded-full transition-colors ${
                                      card.reactions?.some(r => r.type === 'thumbsDown' && r.userId === 'currentUser')
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                    title="Dislike"
                                  >
                                    👎
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
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {group.listings.length === 0 && (
                          <div className="text-center py-8">
                            <p className="text-gray-500 text-sm">No cards yet</p>
                            <button
                              onClick={() => setShowNewCardForm(true)}
                              className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                            >
                              Add your first card
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
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
                    <div className={`flex flex-col rounded-xl p-3 ${
                      message.type === 'poll' ? 'bg-gray-50' : 'bg-white border border-gray-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-700">
                            {message.sender?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{message.sender}</span>
                          <span className="ml-2 text-sm text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      {message.type === 'text' ? (
                        <p className="mt-2 text-gray-700">{message.content}</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          <h4 className="font-medium text-gray-900">{message.poll?.question}</h4>
                          {message.poll?.options.map((option: string, optionIndex: number) => (
                            <button
                              key={optionIndex}
                              onClick={() => handleVote(message.id, option, message.poll?.id || '')}
                              className="w-full p-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Reactions */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {EMOJI_REACTIONS.map((emoji) => {
                          const users = message.reactions?.[emoji] || [];
                          if (users.length === 0) return null;
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(message.id, emoji)}
                              className={`inline-flex items-center px-2 py-1 text-xs rounded-full transition-colors ${
                                users.includes('currentUser')
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {emoji} {users.length}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reaction Button */}
                    <button
                      onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                      className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-gray-100"
                    >
                      <FaceSmileIcon className="h-5 w-5" />
                    </button>

                    {/* Emoji Picker */}
                    {showEmojiPicker === message.id && (
                      <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border p-2 z-10">
                        <div className="flex gap-1">
                          {EMOJI_REACTIONS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(message.id, emoji)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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