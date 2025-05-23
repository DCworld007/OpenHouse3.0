import { useState, Fragment, useEffect, useRef } from 'react';
import { Activity, ActivityType, ActivityDetails } from '@/types/activity';
import { EMOJI_REACTIONS, Message, Poll, PollOption } from '@/types/message';
import { ListingGroup } from '@/types/listing';
import { 
  ChatBubbleLeftRightIcon, 
  ArrowLeftIcon, 
  FaceSmileIcon, 
  PlusIcon,
  ChartBarIcon,
  DocumentPlusIcon,
  XMarkIcon,
  Bars3Icon,
  LinkIcon,
  UserPlusIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon
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
import { PlanningRoomYjsDoc } from '@/types/planning-room';
import { getGroups } from '@/lib/groupStorage';
import { ChatMessage } from '@/types/message';

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
  const { user } = useUser();
  const currentUserId = user?.sub || '';
  const currentUserName = user?.name || currentUserId;
  const currentUserAvatar = user?.picture || undefined;

  const planningRoom = usePlanningRoomSync(group.id, currentUserId);
  const messages: ChatMessage[] = planningRoom.chatMessages as ChatMessage[];
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardNotes, setNewCardNotes] = useState('');
  const [cardType, setCardType] = useState<'what' | 'where'>('what');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<Pick<PollOption, 'text'>[]>([{ text: '' }, { text: '' }]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  const cards = planningRoom.cardOrder
    .map((cardId: string) => planningRoom.linkedCards.find((card: any) => card.id === cardId))
    .filter((card: any): card is NonNullable<typeof card> => Boolean(card));
  console.log('Rendering Yjs cards:', cards.map(c => c.id));

  const chatRef = useRef<HTMLDivElement>(null);
  const [showJumpToUnread, setShowJumpToUnread] = useState(false);
  const [unreadIndex, setUnreadIndex] = useState<number | null>(null);
  const roomKey = `planning-room-last-seen-${group.id}`;
  useEffect(() => {
    const lastSeen = Number(localStorage.getItem(roomKey) || 0);
    const idx = messages.findIndex(m => m.timestamp > lastSeen);
    setUnreadIndex(idx !== -1 ? idx : null);
    setTimeout(() => {
      const chat = chatRef.current;
      if (!chat) return;
      if (idx !== -1 && chat.children[idx]) {
        (chat.children[idx] as HTMLElement).scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        chat.scrollTop = chat.scrollHeight;
      }
    }, 0);
  }, [group.id, messages.length]);
  useEffect(() => {
    return () => {
      if (messages.length > 0) {
        localStorage.setItem(roomKey, String(messages[messages.length - 1].timestamp));
      }
    };
  }, [group.id, messages.length]);
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    planningRoom.addChatMessage({
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      text: newMessage,
      type: 'text',
    });
    setNewMessage('');
    setTimeout(() => {
      if (messages.length > 0) {
        localStorage.setItem(roomKey, String(Date.now()));
      }
    }, 100);
  };
  useEffect(() => {
    const chat = chatRef.current;
    if (!chat || unreadIndex === null) return;
    const onScroll = () => {
      const unreadElem = chat.children[unreadIndex] as HTMLElement | undefined;
      if (!unreadElem) return;
      const unreadTop = unreadElem.getBoundingClientRect().top;
      const chatTop = chat.getBoundingClientRect().top;
      setShowJumpToUnread(Math.abs(unreadTop - chatTop) > 60);
    };
    chat.addEventListener('scroll', onScroll);
    return () => chat.removeEventListener('scroll', onScroll);
  }, [unreadIndex]);
  const jumpToUnread = () => {
    const chat = chatRef.current;
    if (!chat || unreadIndex === null) return;
    const unreadElem = chat.children[unreadIndex] as HTMLElement | undefined;
    if (unreadElem) unreadElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCreatePoll = (question: string, optionsTexts: string[]) => {
    const pollId = uuidv4();
    const newPoll: Poll = {
      id: pollId,
      question,
      options: optionsTexts.map((text, index) => ({ 
        id: `${pollId}-opt-${index}`,
        text,
        votes: [] 
      })),
      createdBy: currentUserId,
      createdAt: Date.now(),
    };
    planningRoom.addPoll(newPoll);

    planningRoom.addChatMessage({
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      text: `Poll created: ${question}`,
      type: 'poll',
      pollId,
    });

    planningRoom.addActivity({
      id: uuidv4(),
      type: 'poll_created',
      userId: currentUserId,
      context: { pollId, pollQuestion: question },
      timestamp: Date.now(),
    });

    setPollQuestion('');
    setPollOptions([{ text: '' }, { text: '' }]);
    setShowPollCreator(false);
  };

  const handleAddCard = async (type: 'what' | 'where', content: string, notes?: string) => {
    const newCardData: any = {
      id: uuidv4(),
      content,
      notes: notes || '',
      cardType: type,
      userId: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (type === 'where') {
      try {
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(content)}`;
        const response = await fetch(geocodeUrl, { headers: { 'User-Agent': 'OpenHouse/3.0' }});
        const results = await response.json();
        
        if (results && results.length > 0) {
          newCardData.lat = parseFloat(results[0].lat);
          newCardData.lng = parseFloat(results[0].lon);
          console.log(`[PlanningRoom] Geocoded location "${content}" to:`, newCardData.lat, newCardData.lng);
        } else {
          console.warn(`[PlanningRoom] Couldn't geocode location "${content}"`);
        }
      } catch (error) {
        console.error(`[PlanningRoom] Error geocoding "${content}":`, error);
      }
    }
    
    planningRoom.addCard(newCardData);

    addActivity('card_add', { 
      cardTitle: newCardData.content, 
      timestamp: Date.now()
    });

    setShowNewCardForm(false);
    setShowActionsMenu(false);
    setNewCardContent('');
    setNewCardNotes('');
  };

  const handleCreateNewCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardContent.trim()) return;
    handleAddCard(cardType, newCardContent, newCardNotes);
  };

  const addActivity = async (type: string, details: any) => {
    const activity = {
      id: uuidv4(),
      type: type as any,
      userId: currentUserId,
      userName: currentUserName,
      userEmail: user?.email || undefined,
      context: details,
      timestamp: Date.now(),
    };
    planningRoom.addActivity(activity);
    try {
      await fetch(`/api/planning-room/${group.id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      });
    } catch (e) {
      console.error('[ActivityFeed] Failed to persist activity to D1:', e);
    }
  };

  const handleCardReaction = (cardId: string, reactionType: 'thumbsUp' | 'thumbsDown') => {
    const updatedGroup = { ...group };
    const updatedListings = updatedGroup.listings.map(listing => {
      if (listing.id === cardId) {
        const reactions = listing.reactions || [];
        const existingReactionIndex = reactions.findIndex(
          r => r.type === reactionType && r.userId === currentUserId
        );

        let updatedReactions = [...reactions];
        if (existingReactionIndex >= 0) {
          updatedReactions.splice(existingReactionIndex, 1);
        } else {
          updatedReactions.push({ type: reactionType, userId: currentUserId });
          const cardTitle =
            typeof listing === 'object'
              ? ('address' in listing && listing.address)
                ? listing.address
                : ('content' in listing && (listing as any).content)
                  ? (listing as any).content
                  : ''
              : '';
          addActivity('card_reaction', {
            cardTitle,
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
      const card = cards[oldIndex];
      if (card) {
        const cardTitle = typeof card === 'object' && 'address' in card ? (card as any).address : (card as any).content;
        addActivity('card_reorder', {
          cardTitle,
          fromIndex: oldIndex,
          toIndex: newIndex,
          timestamp: Date.now()
        });
      }
    }
  };

  const handleVote = (pollId: string, optionId: string) => {
    const ydoc = planningRoom.ydoc;
    if (!ydoc) return;
    const yPolls = ydoc.getArray<Poll>('polls');
    const pollIndex = planningRoom.polls.findIndex(p => p.id === pollId);
    if (pollIndex === -1) return;

    const poll = yPolls.get(pollIndex);
    const optionIndex = poll.options.findIndex(opt => opt.id === optionId);
    if (optionIndex === -1) return;

    const currentVotes = poll.options[optionIndex].votes || [];
    const userVoteIndex = currentVotes.indexOf(currentUserId);

    let newOptions = [...poll.options];
    if (userVoteIndex > -1) {
      newOptions = newOptions.map(opt => ({
        ...opt,
        votes: opt.votes.filter(uid => uid !== currentUserId)
      }));
      newOptions[optionIndex] = {
          ...newOptions[optionIndex],
          votes: [...newOptions[optionIndex].votes, currentUserId]
      };
    } else {
      newOptions = newOptions.map(opt => ({
        ...opt,
        votes: opt.votes.filter(uid => uid !== currentUserId)
      }));
      newOptions[optionIndex] = {
          ...newOptions[optionIndex],
          votes: [...newOptions[optionIndex].votes, currentUserId]
      };
    }
    
    const updatedPoll: Poll = { ...poll, options: newOptions, updatedAt: Date.now() };
    yPolls.delete(pollIndex, 1);
    yPolls.insert(pollIndex, [updatedPoll]);

    planningRoom.addActivity({
      id: uuidv4(),
      type: 'vote_cast',
      userId: currentUserId,
      context: { pollId, pollOptionId: optionId, pollQuestion: poll.question, optionText: poll.options[optionIndex].text },
      timestamp: Date.now(),
    });
  };

  function PollMessage({ poll, senderId, timestamp }: { poll: Poll, senderId: string, timestamp: number }) {
    const totalVotesOnPoll = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    const isMe = senderId === currentUserId;
    const hasUserVoted = poll.options.some(o => o.votes.includes(currentUserId));
    return (
      <div className={`flex flex-col items-${isMe ? 'end' : 'start'} w-full`}>
        <div className="mb-0.5 flex items-center gap-2">
          {poll.userAvatar && !isMe && (
            <img src={poll.userAvatar} alt={poll.userName || `User ${senderId.substring(0, 6)}`} className="h-6 w-6 rounded-full" />
          )}
          <span className={`text-xs font-medium ${isMe ? 'text-indigo-500' : 'text-gray-500'}`}>{isMe ? 'You' : poll.userName || `User ${senderId.substring(0, 6)}`}</span>
          <span className="text-xs text-gray-400">{new Date(timestamp).toLocaleTimeString()}</span>
        </div>
        <div className={`bg-indigo-50 border border-indigo-200 rounded-lg p-4 my-1 shadow-sm max-w-[80%] ${isMe ? 'ml-auto' : 'mr-auto'}`}>
          <div className="font-medium text-indigo-900 mb-2">{poll.question}</div>
          <div className="space-y-2">
            {poll.options.map((option) => {
              const optionVotesCount = option.votes.length;
              const percent = totalVotesOnPoll > 0 ? Math.round((optionVotesCount / totalVotesOnPoll) * 100) : 0;
              const isUserVote = option.votes.includes(currentUserId);
              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(poll.id, option.id)}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg border transition-colors
                    ${isUserVote ? 'bg-indigo-100 border-indigo-400 text-indigo-700 font-semibold' : 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'}
                  `}
                >
                  <span>{option.text}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{optionVotesCount} vote{optionVotesCount !== 1 ? 's' : ''}</span>
                    <span className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden ml-2">
                      <span
                        className="block h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%`, background: isUserVote ? '#6366f1' : '#a5b4fc' }}
                      />
                    </span>
                    <span className="ml-2 text-xs font-medium text-gray-500">{percent}%</span>
                  </span>
                </button>
              );
            })}
          </div>
          {hasUserVoted && (
            <div className="mt-2 text-xs text-indigo-600 font-medium">You voted: {poll.options.find(o => o.votes.includes(currentUserId))?.text}</div>
          )}
        </div>
      </div>
    );
  }

  function renderMessage(message: ChatMessage) {
    if (message.type === 'poll' && message.pollId) {
      const poll = planningRoom.polls.find(p => p.id === message.pollId);
      if (poll) {
        return <PollMessage key={message.id} poll={poll} senderId={message.userId} timestamp={message.timestamp} />;
      }
      return <div key={message.id} className="text-xs text-gray-400 italic p-2">Poll data not found for message ID: {message.id}</div>;
    }
    
    const isMe = message.userId === currentUserId;
    const displayName = message.userName || (isMe ? 'You' : `User ${message.userId.substring(0, 6)}`);
    return (
      <div key={message.id} className={`flex flex-col items-${isMe ? 'end' : 'start'} w-full`}>
        <div className="mb-0.5 flex items-center gap-2">
          {message.userAvatar && !isMe && (
            <img src={message.userAvatar} alt={displayName} className="h-6 w-6 rounded-full" />
          )}
          <span className={`text-xs font-medium ${isMe ? 'text-indigo-500' : 'text-gray-500'}`}>{isMe ? 'You' : displayName}</span>
          <span className="text-xs text-gray-400">{new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
        <div className={`flex flex-col rounded-xl p-3 shadow-sm max-w-[80%] ${isMe ? 'ml-auto bg-indigo-50 border border-indigo-200' : 'mr-auto bg-white border border-gray-200'}`}>
          <p className="text-gray-700">{message.text || ''}</p>
        </div>
      </div>
    );
  }

  const [linkedGroups, setLinkedGroups] = useState<any[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linking, setLinking] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  useEffect(() => {
    async function fetchPersistedActivity() {
      try {
        const res = await fetch(`/api/planning-room/${group.id}/activity`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (Array.isArray(data.activities)) {
          const existingIds = new Set(planningRoom.activityFeed.map((a: any) => a.id));
          data.activities.forEach((activity: any) => {
            if (!existingIds.has(activity.id)) {
              planningRoom.addActivity(activity);
            }
          });
        }
      } catch (e) {
        console.error('[ActivityFeed] Failed to fetch persisted activity:', e);
      }
    }
    fetchPersistedActivity();
  }, [group.id]);

  useEffect(() => {
    async function fetchLinkedGroups() {
      try {
        const currentGroups = getGroups();
        
        const enhancedGroups = currentGroups.map(g => {
          if (!g.cards) g.cards = [];
          if (!g.listings) g.listings = [];
          
          console.log(`[LinkedGroups] Group ${g.id} (${g.name}) has ${g.cards.length} cards and ${g.listings.length} listings`);
          return g;
        });
        
        const groupsParam = encodeURIComponent(JSON.stringify(enhancedGroups));
        
        const apiUrl = `/api/planning-room/${encodeURIComponent(group.id)}/linked-groups?groups=${groupsParam}`;
        console.log('[LinkedGroups] Fetching linked groups:', apiUrl);
        
        const res = await fetch(apiUrl, {
          credentials: 'include'
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('[LinkedGroups] API fetch error:', res.status, errorText);
          
          setLinkedGroups([]);
          return;
        }
        
        const data = await res.json();
        console.log('[LinkedGroups] Response data:', data);
        console.log('[LinkedGroups] linkedGroups array:', data.linkedGroups);
        
        if (!data.linkedGroups || data.linkedGroups.length === 0) {
          console.log('[LinkedGroups] No linked groups found');
        } else {
          console.log('[LinkedGroups] Found linked groups:', data.linkedGroups.length);
          data.linkedGroups.forEach((lg: any, i: number) => {
            console.log(`[LinkedGroups] Group ${i+1}:`, lg.group.id, lg.group.name);
            console.log(`[LinkedGroups] Cards for group ${i+1}:`, lg.cards.length);
            
            const originalGroup = currentGroups.find(g => g.id === lg.group.id);
            if (originalGroup) {
              console.log(`[LinkedGroups DEBUG] Original group from localStorage:`, {
                id: originalGroup.id,
                name: originalGroup.name,
                cardsCount: originalGroup.cards?.length || 0,
                listingsCount: originalGroup.listings?.length || 0
              });
            } else {
              console.log(`[LinkedGroups DEBUG] Group ${lg.group.id} not found in localStorage!`);
            }
          });
        }
        
        setLinkedGroups(data.linkedGroups || []);
        console.log('[LinkedGroups] State updated with:', data.linkedGroups);
      } catch (e) {
        console.error('[LinkedGroups] fetch error:', e);
        setLinkedGroups([]);
      }
    }
    fetchLinkedGroups();
  }, [group.id]);

  async function handleLinkGroup() {
    if (!selectedGroupId) return;
    setLinking(true);
    try {
      const currentGroups = getGroups();
      
      const groupsParam = encodeURIComponent(JSON.stringify(currentGroups));
      const apiUrl = `/api/planning-room/${encodeURIComponent(group.id)}/link?groups=${groupsParam}`;
      console.log('[LinkedGroups] Calling API:', apiUrl);
      console.log('[LinkedGroups] selectedGroupId:', selectedGroupId);
      console.log('[LinkedGroups] Found groups to send:', currentGroups.length);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedGroupId: selectedGroupId }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[LinkedGroups] API error:', res.status, errorText);
        alert(`Failed to link group: ${res.status} error`);
        setShowLinkModal(false);
        setSelectedGroupId('');
        return;
      }
      
      const data = await res.json();
      console.log('[LinkedGroups] link result:', data);
      setShowLinkModal(false);
      setSelectedGroupId('');
      
      const updatedGroups = getGroups();
      const updatedGroupsParam = encodeURIComponent(JSON.stringify(updatedGroups));
      const res2 = await fetch(`/api/planning-room/${encodeURIComponent(group.id)}/linked-groups?groups=${updatedGroupsParam}`);
      if (!res2.ok) {
        console.error('[LinkedGroups] Failed to fetch linked groups:', res2.status);
        return;
      }
      
      const data2 = await res2.json();
      setLinkedGroups(data2.linkedGroups || []);
    } catch (e: any) {
      console.error('[LinkedGroups] link error:', e);
      alert(`Error linking group: ${e.message || 'Unknown error'}`);
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlinkGroup(linkedGroupId: string) {
    try {
      const apiUrl = `/api/planning-room/${encodeURIComponent(group.id)}/unlink`;
      console.log('[LinkedGroups] Unlinking group:', linkedGroupId, 'API:', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedGroupId }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[LinkedGroups] API unlink error:', res.status, errorText);
        alert(`Failed to unlink group: ${res.status} error`);
        return;
      }
      
      const data = await res.json();
      console.log('[LinkedGroups] unlink result:', data);
      
      setLinkedGroups(prev => prev.filter(lg => lg.group.id !== linkedGroupId));
      
      try {
        const allGroups = getGroups();
        const groupsParam = encodeURIComponent(JSON.stringify(allGroups));
        const res2 = await fetch(`/api/planning-room/${encodeURIComponent(group.id)}/linked-groups?groups=${groupsParam}`);
        if (res2.ok) {
      const data2 = await res2.json();
      setLinkedGroups(data2.linkedGroups || []);
        }
    } catch (e) {
        console.error('[LinkedGroups] Failed to refetch after unlinking:', e);
      }
    } catch (e: any) {
      console.error('[LinkedGroups] unlink error:', e);
      alert(`Error unlinking group: ${e.message || 'Unknown error'}`);
    }
  }

  async function handleSyncCopiedCards(originalGroupId: string) {
    try {
      const currentGroups = getGroups();
      const originalGroup = currentGroups.find(g => g.id === originalGroupId);
      
      if (!originalGroup) {
        console.error('[LinkedGroups] Original group not found in localStorage');
        alert('Could not find original group to sync with');
        return;
      }
      
      const apiUrl = `/api/planning-room/${encodeURIComponent(group.id)}/sync-copied-cards`;
      console.log('[LinkedGroups] Syncing copied cards from group:', originalGroupId);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalGroupId,
          originalGroup
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[LinkedGroups] API sync error:', res.status, errorText);
        alert(`Failed to sync cards: ${res.status} error`);
        return;
      }
      
      const data = await res.json();
      console.log('[LinkedGroups] sync result:', data);
      
      const updatedGroups = getGroups();
      const groupsParam = encodeURIComponent(JSON.stringify(updatedGroups));
      const res2 = await fetch(`/api/planning-room/${encodeURIComponent(group.id)}/linked-groups?groups=${groupsParam}`);
      if (res2.ok) {
        const data2 = await res2.json();
        setLinkedGroups(data2.linkedGroups || []);
        
        alert(`Successfully synced ${data.syncedCount || 0} cards from ${originalGroup.name}`);
      }
    } catch (e: any) {
      console.error('[LinkedGroups] sync error:', e);
      alert(`Error syncing cards: ${e.message || 'Unknown error'}`);
    }
  }

  const availableGroups = getGroups().filter(
    g => g.id !== group.id && !linkedGroups.some(lg => lg.group.id === g.id)
  );

  const uniqueActivitiesById = (activities: (Activity | null)[]) => {
    const seenIds = new Set<string>();
    return activities.filter(activity => {
      if (activity && activity.id && !seenIds.has(activity.id)) {
        seenIds.add(activity.id);
        return true;
      }
      return false;
    });
  };

  const handleGenerateInviteLink = async () => {
    setIsGeneratingLink(true);
    setGeneratedInviteLink('');
    setInviteLinkCopied(false);
    
    try {
      console.log(`[Invite] Starting invite generation for group:`, {
        groupId: group.id,
        groupName: group.name,
        cards: cards.length,
      });

      const createRoomRes = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: group.id,
          name: group.name
        })
      });

      if (!createRoomRes.ok) {
        console.error(`[Invite] Failed to ensure room exists:`, {
          status: createRoomRes.status,
          statusText: createRoomRes.statusText,
          groupId: group.id
        });
        throw new Error(`Failed to prepare room for invite. Please try again.`);
      }

      const roomCheckRes = await fetch(`/api/planning-room/${group.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!roomCheckRes.ok) {
        console.error(`[Invite] Room check failed:`, {
          status: roomCheckRes.status,
          statusText: roomCheckRes.statusText,
          groupId: group.id
        });
        throw new Error(`Room not found or not accessible. Please refresh the page and try again.`);
      }

      const res = await fetch(`/api/planning-room/${group.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Invite] Failed to generate invite:`, {
          status: res.status,
          statusText: res.statusText,
          error: errorText,
          groupId: group.id
        });
        throw new Error(`Failed to generate invite: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('[Invite] Response data:', data);
      
      if (data.url) {
        setGeneratedInviteLink(data.url);
      } else if (data.inviteUrl) {
        setGeneratedInviteLink(data.inviteUrl);
      } else if (data.token) {
        const baseUrl = window.location.origin;
        const fullUrl = `${baseUrl}/invite/${data.token}`;
        setGeneratedInviteLink(fullUrl);
      } else {
        throw new Error('No invite URL or token returned from server');
      }
      
      setShowInviteModal(true);
    } catch (error: any) {
      console.error('[InviteLink] Error generating invite link:', error);
      alert(`Error: ${error.message || 'Failed to generate invite link'}`);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2000);
    }).catch(err => {
      console.error('[Clipboard] Failed to copy:', err);
      alert('Failed to copy link.');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateInviteLink}
                disabled={isGeneratingLink}
                className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition disabled:opacity-50"
                title="Invite Users"
              >
                {isGeneratingLink ? 
                  <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg> : 
                  <UserPlusIcon className="h-5 w-5" />
                }
              </button>
              <button
                onClick={() => setShowLinkModal(true)}
                className="p-1.5 text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 rounded-full bg-indigo-50 transition"
                title="Link Group"
              >
                <LinkIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setShowNewCardForm(true);
                }}
                className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition"
                title="Add new card"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowLinkModal(true)}
                      className="p-1.5 text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 rounded-full bg-indigo-50 transition"
                      title="Link Group"
                    >
                      <LinkIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setShowNewCardForm(true)}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-indigo-50"
                      title="Add new card"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
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
                            userId={currentUserId}
                            addActivity={addActivity}
                          />
                        ) : null
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {linkedGroups.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-indigo-700 mb-2">Linked Groups ({linkedGroups.length})</h3>
                    {linkedGroups.map(lg => {
                      console.log(`Rendering linked group ${lg.group.name} with ${lg?.cards?.length || 0} cards`);
                      const isCopied = lg.group.isCopied === true;
                      const isLinked = lg.group.isLinked === true;
                      
                      return (
                      <div key={lg.group.id} className={`mb-6 border rounded-lg p-3 ${isCopied ? 'bg-green-50 border-green-200' : 'bg-indigo-50 border-indigo-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-indigo-700">
                              {isCopied ? 'Copied from ' : 'Linked to '}
                              {lg.group.name}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isCopied ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'}`}>
                              {isCopied ? 'Copied' : 'Linked'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.open(`/planning-room/${lg.group.id}`, '_blank')}
                              className="text-xs text-blue-500 hover:underline"
                              title="Open linked group in new tab"
                            >
                              View
                            </button>
                            {isCopied && (
                              <button
                                onClick={() => handleSyncCopiedCards(lg.group.id)}
                                className="text-xs text-green-600 hover:underline"
                                title="Update cards with the latest changes from original group"
                              >
                                Sync
                              </button>
                            )}
                          <button
                            onClick={() => handleUnlinkGroup(lg.group.id)}
                            className="text-xs text-red-500 hover:underline"
                              title={`${isCopied ? 'Remove these copies' : 'Unlink this group'}`}
                            >
                              {isCopied ? 'Remove' : 'Unlink'}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {lg.cards && Array.isArray(lg.cards) && lg.cards.length > 0 ? (
                            lg.cards.map((card: any) => {
                              console.log(`Card in ${isCopied ? 'copied' : 'linked'} group:`, card);
                              return (
                                <div key={card.id || Math.random().toString()} 
                                  className={`rounded border px-3 py-2 text-sm text-gray-900 ${
                                    isCopied ? 'bg-white border-green-200' : 'bg-white border-indigo-200'
                                  }`}
                                >
                                  <div className="font-medium">{card.content || '(No content)'}</div>
                                  {card.notes && <div className="text-xs text-gray-500 mt-1">{card.notes}</div>}
                                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                                      card.cardType === 'where' 
                                        ? 'bg-blue-50 text-blue-700' 
                                        : 'bg-green-50 text-green-700'
                                    }`}>
                                      {card.cardType === 'where' ? 'Where' : 'What'}
                                    </span>
                                    {isCopied && (
                                      <span className="text-xs text-gray-500">
                                        Copied from original card
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="bg-gray-50 rounded border border-gray-200 px-3 py-2 text-sm text-gray-500">
                              No cards in this group - try adding some cards to this group and they'll appear here.
                              <button 
                                onClick={() => window.open(`/planning-room/${lg.group.id}`, '_blank')} 
                                className="mt-2 block text-blue-500 hover:underline text-xs"
                              >
                                Open this group to add cards
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )})}
                  </div>
                )}
                
                {linkedGroups.length === 0 && (
                  <div className="mt-8 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">No linked groups yet. Click the link icon to connect another group.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[600px] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-lg font-semibold flex items-center text-gray-900">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Group Chat
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatRef}>
                {messages.map((message, i) => {
                  if (unreadIndex === i) {
                    return (
                      <Fragment key={message.id}>
                        <div className="flex items-center my-2">
                          <div className="flex-1 border-t border-gray-300" />
                          <span className="mx-3 text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">New messages</span>
                          <div className="flex-1 border-t border-gray-300" />
                        </div>
                        {renderMessage(message)}
                      </Fragment>
                    );
                  }
                  return renderMessage(message);
                })}
                {messages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No messages yet. Start the conversation!
                  </div>
                )}
                {showJumpToUnread && unreadIndex !== null && (
                  <button
                    onClick={jumpToUnread}
                    className="fixed bottom-24 right-1/2 translate-x-1/2 z-20 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-indigo-700 transition-all"
                  >
                    Jump to Unread
                  </button>
                )}
              </div>

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

          <div className="col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
              </div>
              <div className="h-[550px] overflow-y-auto">
                <ActivityFeed activities={uniqueActivitiesById(
                  planningRoom.activityFeed.slice().reverse().map((a: any) => { 
                  let type: any = a.type;
                  if (type === 'poll_created') type = 'poll_create';
                  if (type === 'card_linked') type = 'card_add';
                  if (type === 'card_reordered') type = 'card_reorder';
                  if (type === 'vote_cast') type = 'poll_vote';
                  const validTypes = ['card_reaction', 'card_reorder', 'poll_vote', 'card_add', 'card_edit', 'poll_create'];
                  if (!validTypes.includes(type)) return null;
                  return {
                      id: a.id,
                    type,
                      timestamp: a.timestamp,
                      userId: a.userId,
                      userName: a.userName,
                      userEmail: a.userEmail,
                    details: a.context || {},
                  };
                  })
                ) as Activity[]} />
              </div>
            </div>
          </div>
        </div>
      </div>

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
                if (!pollQuestion.trim() || pollOptions.some(opt => !opt.text.trim())) return;
                handleCreatePoll(pollQuestion, pollOptions.map(opt => opt.text));
                setPollQuestion('');
                setPollOptions([{ text: '' }, { text: '' }]);
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
                      value={option.text}
                      onChange={e => {
                        const newOptions = [...pollOptions];
                        newOptions[index] = { ...option, text: e.target.value };
                        setPollOptions(newOptions);
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 px-4"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, { text: '' }])}
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
                      setPollOptions([{ text: '' }, { text: '' }]);
                      setShowPollCreator(false);
                    }}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!pollQuestion.trim() || pollOptions.some(opt => !opt.text.trim())}
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

      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px] p-6">
            <h3 className="text-lg font-semibold mb-4">Link Group</h3>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
            >
              <option value="">Select a group...</option>
              {availableGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
                disabled={linking}
              >Cancel</button>
              <button
                onClick={handleLinkGroup}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                disabled={!selectedGroupId || linking}
              >{linking ? 'Linking...' : 'Link Group'}</button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Invite to {group.name}</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Share this link with others to invite them to your planning room.
              </p>
              
              {!generatedInviteLink ? (
                <div className="flex justify-center py-4">
                  <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <input
                    type="text"
                    value={generatedInviteLink}
                    readOnly
                    className="flex-1 p-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => copyToClipboard(generatedInviteLink)}
                    className={`inline-flex items-center justify-center px-3 py-2 rounded-md transition-colors text-sm font-medium 
                      ${inviteLinkCopied 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    disabled={!generatedInviteLink}
                  >
                    {inviteLinkCopied ? 
                      <CheckCircleIcon className="h-5 w-5 mr-1.5" /> :
                      <ClipboardDocumentIcon className="h-5 w-5 mr-1.5" />
                    }
                    {inviteLinkCopied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 text-right">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableCard({ card, index, setActiveCardId, setShowNewCardForm, planningRoom, userId, addActivity }: any) {
  const reactions = planningRoom.reactions?.[card.id] || {};
  const userReaction = reactions[userId] || null;
  const likeCount = Object.values(reactions).filter(r => r === 'like').length;
  const dislikeCount = Object.values(reactions).filter(r => r === 'dislike').length;
  
  const isLinkedCard = card.linkedFrom && card.linkedFromName;

  console.log('SortableCard', card.id, { reactions, userReaction, likeCount, dislikeCount, isLinkedCard });

  const handleReaction = (type: 'like' | 'dislike') => {
    const currentReactionOnCard = userReaction;

    if (currentReactionOnCard === type) {
      planningRoom.removeReaction(card.id);
    } else {
      planningRoom.addReaction(card.id, type);
      
      const reactionTypeForActivity: 'thumbsUp' | 'thumbsDown' = type === 'like' ? 'thumbsUp' : 'thumbsDown';
      addActivity('card_reaction', {
        cardTitle: card.content,
        reactionType: reactionTypeForActivity,
        timestamp: Date.now()
      });
    }
  };

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
      <div className={`bg-white rounded-lg border ${isLinkedCard ? 'border-indigo-300' : 'border-gray-200'} px-4 py-5 flex items-center hover:border-indigo-300 transition-colors shadow-sm relative group`}>
        <button
          className="mr-3 p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing"
          tabIndex={0}
          aria-label="Drag to reorder"
          type="button"
          {...listeners}
        >
          <Bars3Icon className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 flex items-center">
                {card.cardType === 'where' ? 'Where' : 'What'}
                {isLinkedCard && (
                  <span className="ml-2 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                    From {card.linkedFromName}
                  </span>
                )}
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