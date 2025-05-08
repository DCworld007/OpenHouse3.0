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
              <HandThumbUpIcon className="inline h-4 w-4 text-green-600" />
            ) : (
              <HandThumbDownIcon className="inline h-4 w-4 text-red-600" />
            )}
            {' '} to card "{activity.details.cardTitle}"
          </>
        );
      case 'card_reorder':
        return `moved card "${activity.details.cardTitle}" from position ${activity.details.fromIndex! + 1} to ${activity.details.toIndex! + 1}`;
      case 'poll_vote':
        return `voted for "${activity.details.pollOption}" in poll "${activity.details.pollQuestion}"`;
      case 'card_add':
        return `added a new card "${activity.details.cardTitle}"`;
      case 'card_edit':
        return `edited card "${activity.details.cardTitle}"`;
      case 'poll_create':
        return `created a new poll "${activity.details.pollQuestion}"`;
      default:
        console.warn('Unknown activity type:', activity.type);
        return 'performed an action';
    }
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
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                    {activityIcons[activity.type]}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-900">
                    <span className="font-medium">{activity.userName || activity.userEmail || activity.userId}</span>
                    {' '}
                    {getActivityMessage(activity)}
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