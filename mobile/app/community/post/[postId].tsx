import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CommunityPostDetailsRoute() {
  const { postId } = useLocalSearchParams<{ postId?: string }>();

  if (typeof postId !== 'string' || postId.length === 0) {
    return <Redirect href="/community" />;
  }

  return <Redirect href={`/community?postId=${postId}`} />;
}
