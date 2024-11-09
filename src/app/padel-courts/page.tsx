'use client'
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { scrapeWebsite } from '@/lib/scrape';

const PadelLocations = () => {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchAndParseData = async () => {
      try {
        const response = await scrapeWebsite('https://www.dpv-padel.de/standorte-2/');
        
        // Get all table rows (excluding header)
        const rows = response.match(/<tr[^>]*>[\s\S]*?<\/tr>/g).slice(1);
        const extractedLocations: { name: string, link: string, addressLines: string[] }[] = [];

        let idx = 0;
        rows.forEach((row: string) => {
            if (idx > 0) {
                return;
            }
          const firstCell = row.match(/<td[^>]*has-text-align-left[^>]*>([\s\S]*?)<\/td>/);
          
          if (firstCell) {
            const cellContent = firstCell[1];
            
            // Extract name
            const nameMatch = cellContent.match(/<strong>(.*?)<\/strong>/);
            const name = nameMatch ? nameMatch[1].trim() : '';
            
            // Extract link
            const linkMatch = cellContent.match(/<a[^>]*href="([^"]*)"[^>]*>/);
            const link = linkMatch ? linkMatch[1] : '';
            
            // Extract address lines
            let addressContent = cellContent
              .replace(/<strong>.*?<\/strong>/, '')
              .replace(/<a.*?<\/a>/, '');
            
            const addressLines = addressContent
              .split(/<br\/?>/g)
              .map(line => line.trim().replace("<br />", ''))
              .filter(line => line);
            
            if (name) {
              extractedLocations.push({ name, link, addressLines });
            }
          }
          idx++;
        });
        
        setLocations(extractedLocations);
      } catch (error) {
        console.error('Error parsing locations:', error);
      }
    };
    
    fetchAndParseData();
  }, []);
  
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
                  <p key={i} className="text-sm text-gray-600">{line}</p>
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