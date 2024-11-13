'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface Location {
  name: string;
  link: string;
  addressLines: string[];
}

const PadelLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/scrape-padel-courts');
        if (!response.ok) {
          throw new Error('Failed to fetch locations');
        }
        const data = await response.json();
        setLocations(data);
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  if (isLoading) {
    return <div>Loading locations...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Padel Locations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {locations.map((location, index) => (
            <Card key={index} className="p-4">
              <h3 className="text-lg font-bold">{location.name}</h3>
              {location.addressLines && (
                <div className="mt-2 space-y-1">
                  {location.addressLines.map((line, i) => (
                    <p key={i} className="text-sm text-gray-600">
                      {line}
                    </p>
                  ))}
                </div>
              )}
              {location.link && (
                <a
                  href={location.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm mt-2 block"
                >
                  {location.link}
                </a>
              )}
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PadelLocations;
