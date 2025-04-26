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
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'card_reaction':
        return <HandThumbUpIcon className="h-5 w-5" />;
      case 'card_reorder':
        return <ArrowsUpDownIcon className="h-5 w-5" />;
      case 'poll_vote':
        return <ChartBarIcon className="h-5 w-5" />;
      case 'card_add':
        return <DocumentPlusIcon className="h-5 w-5" />;
      case 'card_edit':
        return <PencilIcon className="h-5 w-5" />;
      case 'poll_create':
        return <ChartBarIcon className="h-5 w-5" />;
    }
  };

  const getActivityMessage = (activity: Activity) => {
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
          activities.map((activity) => (
            <div
              key={activity.id}
              className="p-4 hover:bg-gray-50 transition-colors flex items-start space-x-3"
            >
              <div className="flex-shrink-0 mt-1">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                  {getActivityIcon(activity.type)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-900">
                  <span className="font-medium">{activity.userId}</span>
                  {' '}
                  {getActivityMessage(activity)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 