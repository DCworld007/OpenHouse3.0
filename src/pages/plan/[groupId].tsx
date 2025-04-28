import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import PlanRoutePage from './PlanRoutePage';

export default function PlanProtected() {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();
  const { groupId } = router.query;

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="text-center py-16">Loading...</div>;
  }

  if (!groupId || typeof groupId !== 'string') {
    return <div className="text-center py-16">Invalid group ID</div>;
  }

  return <PlanRoutePage groupId={groupId} />;
} 