import { NewGameForm } from '@/components/new-game-form';
import { fetchVenues } from '@/lib/api';
import { Venue } from '@/types/game';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
  useQuery,
} from '@tanstack/react-query';

export default async function NewGamePage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['venues'],
    queryFn: fetchVenues,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-8">Create New Game</h1>
        <NewGameForm />
      </main>
    </HydrationBoundary>
  );
}
