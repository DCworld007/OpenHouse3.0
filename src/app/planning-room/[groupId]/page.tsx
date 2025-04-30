import { getStaticGroupIds } from '@/lib/staticGroups';
import PlanningRoomClient from './PlanningRoomClient';

export function generateStaticParams() {
  const groupIds = getStaticGroupIds();
  return groupIds.map((id) => ({
    groupId: id,
  }));
}

export default function PlanningRoomPage({ params }: { params: { groupId: string } }) {
  return <PlanningRoomClient groupId={params.groupId} />;
} 