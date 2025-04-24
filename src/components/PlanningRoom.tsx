import { useState } from 'react';
import { ListingGroup, Listing } from '@/types/listing';
import { Activity, ActivityType } from '@/types/activity';
import { 
  ChatBubbleLeftRightIcon, 
  ArrowLeftIcon, 
  FaceSmileIcon, 
  PlusIcon,
  ChartBarIcon,
  DocumentPlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Card from './Card';
import { Switch } from '@headlessui/react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import ActivityFeed from './ActivityFeed';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  type: 'text' | 'poll';
  reactions: { [key: string]: string[] }; // emoji: userIds[]
  poll?: {
    question: string;
    options: string[];
    votes: { [key: string]: string[] }; // optionIndex: userIds[]
  };
}

const EMOJI_REACTIONS = ['👍', '❤️', '😊', '🎉', '👏', '🤔'];

export default function PlanningRoom({ group }: { group: ListingGroup }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [cardType, setCardType] = useState<'where' | 'what'>('where');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardNotes, setNewCardNotes] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'You', // Replace with actual user name when auth is implemented
      timestamp: Date.now(),
      type: 'text',
      reactions: {},
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) return;

    const message: Message = {
      id: Date.now().toString(),
      text: pollQuestion,
      sender: 'You',
      timestamp: Date.now(),
      type: 'poll',
      reactions: {},
      poll: {
        question: pollQuestion,
        options: pollOptions.filter(opt => opt.trim()),
        votes: {},
      },
    };

    setMessages([...messages, message]);

    // Add activity
    addActivity('poll_create', {
      pollQuestion: pollQuestion
    });

    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPollCreator(false);
  };

  const handleVote = (messageId: string, optionIndex: number) => {
    setMessages(messages.map(message => {
      if (message.id === messageId && message.poll) {
        const votes = { ...message.poll.votes };
        const currentVotes = votes[optionIndex] || [];
        const userId = 'currentUser';
        votes[optionIndex] = currentVotes.includes(userId) 
          ? currentVotes.filter(id => id !== userId)
          : [...currentVotes, userId];

        // Add activity if adding a vote (not removing)
        if (!currentVotes.includes(userId)) {
          addActivity('poll_vote', {
            pollQuestion: message.poll.question,
            pollOption: message.poll.options[optionIndex]
          });
        }

        return {
          ...message,
          poll: {
            ...message.poll,
            votes,
          },
        };
      }
      return message;
    }));
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(messages.map(message => {
      if (message.id === messageId) {
        const reactions = { ...message.reactions };
        const currentReactions = reactions[emoji] || [];
        const userId = 'currentUser'; // Replace with actual user ID when auth is implemented
        reactions[emoji] = currentReactions.includes(userId)
          ? currentReactions.filter(id => id !== userId)
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
      id: crypto.randomUUID(),
      address: newCardContent,
      cardType: cardType,
      groupId: group.id,
      imageUrl: cardType === 'where' ? '/marker-icon-2x.png' : '/placeholder-activity.jpg',
      sourceUrl: '',
      source: 'manual',
      price: 0,
      notes: newCardNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: group.listings.length,
      reactions: [] // Initialize empty reactions array
    };

    // Add the new card to the group's listings
    group.listings.push(newCard);
    
    // Add activity
    addActivity('card_add', {
      cardId: newCard.id,
      cardTitle: newCard.address
    });

    setNewCardContent('');
    setNewCardNotes('');
    setShowNewCardForm(false);
    setShowActionsMenu(false);
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    
    if (!destination) return;

    const reorderedCards = Array.from(group.listings);
    const [reorderedItem] = reorderedCards.splice(source.index, 1);
    reorderedCards.splice(destination.index, 0, reorderedItem);

    // Update the order property for each card
    const updatedCards = reorderedCards.map((card, index) => ({
      ...card,
      order: index
    }));

    // Update the group's listings
    group.listings = updatedCards;

    // Add activity
    addActivity('card_reorder', {
      cardId: reorderedItem.id,
      cardTitle: reorderedItem.address,
      fromIndex: source.index,
      toIndex: destination.index
    });
  };

  const addActivity = (type: ActivityType, details: Activity['details']) => {
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      type,
      userId: 'temp-user-id', // TODO: Replace with actual user ID when auth is implemented
      timestamp: new Date().toISOString(),
      groupId: group.id,
      details
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  const handleCardReaction = (cardId: string, type: 'thumbsUp' | 'thumbsDown', action: 'add' | 'remove') => {
    const card = group.listings.find(l => l.id === cardId);
    if (!card) return;

    const currentUserId = 'temp-user-id'; // TODO: Replace with actual user ID when auth is implemented

    // Initialize reactions if undefined
    if (!card.reactions) {
      card.reactions = [];
    }
    
    if (action === 'add') {
      card.reactions.push({
        type,
        userId: currentUserId
      });
      
      // Add activity
      addActivity('card_reaction', {
        cardId,
        cardTitle: card.address,
        reactionType: type,
        action: 'add'
      });
    } else {
      card.reactions = card.reactions.filter(r => !(r.userId === currentUserId && r.type === type));
      
      // Add activity
      addActivity('card_reaction', {
        cardId,
        cardTitle: card.address,
        reactionType: type,
        action: 'remove'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <h1 className="ml-4 text-xl font-semibold text-gray-900">{group.name} - Planning Room</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Chat and Activity Feed Section */}
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="flex gap-4 h-full">
            {/* Chat Section */}
            <div className="flex-1 bg-white rounded-lg shadow h-full">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                  Group Chat
                </h2>
              </div>

              <div className="h-[calc(100vh-24rem)] flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(message => (
                    <div key={message.id} className="relative group">
                      <div className="flex flex-col bg-white rounded-lg shadow-sm p-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{message.sender}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {message.type === 'text' ? (
                          <p className="mt-1">{message.text}</p>
                        ) : (
                          <div className="mt-2 space-y-2">
                            <p className="font-medium">{message.poll?.question}</p>
                            {message.poll?.options.map((option, index) => {
                              const votes = message.poll?.votes[index] || [];
                              const totalVotes = Object.values(message.poll?.votes || {}).reduce((sum, voters) => sum + voters.length, 0);
                              const percentage = totalVotes > 0 ? (votes.length / totalVotes) * 100 : 0;
                              const hasVoted = votes.includes('currentUser');

                              return (
                                <button
                                  key={index}
                                  onClick={() => handleVote(message.id, index)}
                                  className="w-full text-left"
                                >
                                  <div className="relative">
                                    <div
                                      className={`absolute inset-0 ${hasVoted ? 'bg-indigo-100' : 'bg-gray-100'} rounded`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                    <div className="relative px-3 py-2 flex justify-between">
                                      <span>{option}</span>
                                      <span>{votes.length} votes</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Reactions */}
                        {Object.entries(message.reactions).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(message.reactions).map(([emoji, users]) => (
                              users.length > 0 && (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(message.id, emoji)}
                                  className={`px-2 py-1 text-sm rounded-full ${
                                    users.includes('currentUser')
                                      ? 'bg-indigo-100 text-indigo-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {emoji} {users.length}
                                </button>
                              )
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reaction Button */}
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                        className="absolute right-0 top-2 p-1.5 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FaceSmileIcon className="h-5 w-5" />
                      </button>

                      {/* Emoji Picker */}
                      {showEmojiPicker === message.id && (
                        <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border p-2 z-10">
                          <div className="flex gap-1">
                            {EMOJI_REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(message.id, emoji)}
                                className="p-1.5 hover:bg-gray-100 rounded"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {showPollCreator && (
                  <div className="px-4 py-3 border-t bg-gray-50">
                    <form onSubmit={handleCreatePoll} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700">Create a Poll</h3>
                        <button
                          type="button"
                          onClick={() => setShowPollCreator(false)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={e => setPollQuestion(e.target.value)}
                        placeholder="Ask a question..."
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 px-4"
                      />
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
                      <button
                        type="submit"
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                      >
                        Create Poll
                      </button>
                    </form>
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

                <form onSubmit={handleSendMessage} className="p-4 border-t">
                  <div className="flex space-x-3 items-center">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                      
                      {/* Actions Menu */}
                      {showActionsMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPollCreator(true);
                              setShowActionsMenu(false);
                            }}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
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
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
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
                      className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 px-4"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="w-80 flex-shrink-0 h-[calc(100vh-24rem)]">
              <ActivityFeed activities={activities} />
            </div>
          </div>
        </div>

        {/* Cards Section */}
        <div className="border-t bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Cards</h2>
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="cards" direction="horizontal">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="overflow-x-auto pb-4"
                  >
                    <div className="flex gap-4">
                      {group.listings.map((card, index) => (
                        <Draggable 
                          key={card.id} 
                          draggableId={card.id} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex-shrink-0 w-[300px] ${
                                snapshot.isDragging ? 'opacity-50' : ''
                              }`}
                            >
                              <Card
                                listing={card}
                                onEdit={() => {}}
                                onReaction={handleCardReaction}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </div>
    </div>
  );
} 