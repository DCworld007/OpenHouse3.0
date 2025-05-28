import { Activity, ActivityType } from '@/types/activity';
import { format } from 'date-fns';
import { 
  HandThumbUpIcon, 
  HandThumbDownIcon,
  ArrowsUpDownIcon,
  DocumentPlusIcon,
  PencilIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface ActivityFeedProps {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  // Debug log for activities prop
  console.log('ActivityFeed received activities:', activities);

  const activityIcons: Record<ActivityType, JSX.Element> = {
    'card_reaction': <HandThumbUpIcon className="h-5 w-5" />,
    'card_reorder': <ArrowsUpDownIcon className="h-5 w-5" />,
    'poll_vote': <ChartBarIcon className="h-5 w-5" />,
    'card_add': <DocumentPlusIcon className="h-5 w-5" />,
    'card_edit': <PencilIcon className="h-5 w-5" />,
    'poll_create': <ChartBarIcon className="h-5 w-5" />
  };

  const getActivityMessage = (activity: Activity): JSX.Element | string => {
    const cardTitle = activity.details.cardTitle || activity.details.context?.content;
    const pollQuestion = activity.details.pollQuestion;
    const optionText = activity.details.optionText;

    // Debug log for individual activity processing
    console.log('Processing activity:', {
      id: activity.id,
      type: activity.type,
      expectedTypes: Object.keys(activityIcons),
      isTypeValid: activity.type in activityIcons,
      details: activity.details
    });

    switch (activity.type) {
      case 'card_reaction':
        return (
          <>
            reacted with {' '}
            {activity.details.reactionType === 'thumbsUp' ? (
              <span className="inline-flex items-center">
                <HandThumbUpIcon className="inline h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600 font-medium">liked</span>
              </span>
            ) : (
              <span className="inline-flex items-center">
                <HandThumbDownIcon className="inline h-4 w-4 text-red-600 mr-1" />
                <span className="text-red-600 font-medium">disliked</span>
              </span>
            )}
            {' '} the card{' '}
            <span className="font-medium text-gray-900">"{cardTitle}"</span>
          </>
        );
      case 'card_reorder':
        return (
          <>
            moved card{' '}
            <span className="font-medium text-gray-900">"{cardTitle}"</span>
            {activity.details.context?.fromIndex !== undefined && activity.details.context?.toIndex !== undefined ? (
              <> from position {activity.details.context.fromIndex + 1} to {activity.details.context.toIndex + 1}</>
            ) : (
              ' to a new position'
            )}
          </>
        );
      case 'poll_vote':
        return (
          <>
            voted for{' '}
            <span className="font-medium text-gray-900">"{optionText}"</span>
            {' '}in poll{' '}
            <span className="font-medium text-gray-900">"{pollQuestion}"</span>
          </>
        );
      case 'card_add':
        return (
          <>
            added a new{' '}
            {activity.details.context?.cardType === 'where' ? 'location' : 'activity'} card{' '}
            <span className="font-medium text-gray-900">"{cardTitle}"</span>
          </>
        );
      case 'card_edit':
        return (
          <>
            edited card{' '}
            <span className="font-medium text-gray-900">"{cardTitle}"</span>
          </>
        );
      case 'poll_create':
        return (
          <>
            created a new poll{' '}
            <span className="font-medium text-gray-900">"{pollQuestion}"</span>
          </>
        );
      default:
        console.warn('Unknown activity type:', activity.type);
        return 'performed an action';
    }
  };

  const getUserDisplayName = (activity: Activity): string => {
    if (activity.details.userName) return activity.details.userName;
    if (activity.details.userEmail) return activity.details.userEmail.split('@')[0];
    return 'Unknown User';
  };

  return (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Activity Feed</h2>
      </div>
      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 p-4">No activity yet</p>
        ) : (
          activities.map((activity) => {
            // Debug log for icon rendering
            if (!(activity.type in activityIcons)) {
              console.error('Invalid activity type for icons:', {
                type: activity.type,
                availableTypes: Object.keys(activityIcons)
              });
            }
            
            return (
              <div
                key={activity.id}
                className="p-4 hover:bg-gray-50 transition-colors flex items-start space-x-3"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'card_reaction' 
                      ? activity.details.reactionType === 'thumbsUp'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {activityIcons[activity.type]}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-semibold text-indigo-600">{getUserDisplayName(activity)}</span>
                    {' '}
                    <span className="text-gray-900">{getActivityMessage(activity)}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
} 