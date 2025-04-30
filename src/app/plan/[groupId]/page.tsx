import { getStaticGroupIds } from '@/lib/staticGroups';
import PlanRouteClient from './PlanRouteClient';

export function generateStaticParams() {
  const groupIds = getStaticGroupIds();
  return groupIds.map((id) => ({
    groupId: id,
  }));
}

export default function PlanRoutePage({ params }: { params: { groupId: string } }) {
  return <PlanRouteClient groupId={params.groupId} />;
} 