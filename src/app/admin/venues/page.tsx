import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { VenuesList } from '@/components/admin/venues-list';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default async function AdminVenuesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || session.user.email !== 'ndilthey@gmail.com') {
    redirect('/');
  }

  return (
    <main className="container mx-auto py-10">
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Games</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Admin - Venues</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Manage Venues</h1>
          <VenuesList />
        </div>
      </div>
    </main>
  );
}
