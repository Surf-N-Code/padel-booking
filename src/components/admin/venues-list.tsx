'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Pencil, Save, X } from 'lucide-react';
import { Venue } from '@/types/game';
import { Skeleton } from '../ui/skeleton';

export function VenuesList() {
  const queryClient = useQueryClient();
  const [editingVenue, setEditingVenue] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  const { data: venues, isLoading } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const response = await fetch('/api/admin/venues');
      if (!response.ok) throw new Error('Failed to fetch venues');
      return response.json();
    },
  });

  const { mutate: updateVenue, isLoading: isUpdating } = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const response = await fetch(`/api/admin/venues/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (!response.ok) throw new Error('Failed to update venue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      toast.success('Venue updated successfully');
      setEditingVenue(null);
      setEditedName('');
    },
    onError: () => {
      toast.error('Failed to update venue');
    },
  });

  const handleEdit = (venue: Venue) => {
    setEditingVenue(venue.id);
    setEditedName(venue.label);
  };

  const handleSave = (id: string) => {
    if (editedName.trim()) {
      updateVenue({ id, label: editedName.trim() });
    }
  };

  const handleCancel = () => {
    setEditingVenue(null);
    setEditedName('');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Venue Name</TableHead>
            <TableHead>Link</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {venues?.map((venue: Venue) => (
            <TableRow key={venue.id}>
              <TableCell>
                {editingVenue === venue.id ? (
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter venue name"
                  />
                ) : (
                  venue.label
                )}
              </TableCell>
              <TableCell>
                <a
                  href={venue.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Book
                </a>
              </TableCell>
              <TableCell>{venue.addressLines}</TableCell>
              <TableCell>
                {editingVenue === venue.id ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSave(venue.id)}
                      disabled={isUpdating}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isUpdating}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(venue)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
