import { redis } from '@/lib/redis';
import { scrapeWebsite } from '@/lib/scrape';
import { lg } from '@/lib/utils';
import { NextResponse } from 'next/server';

const CACHE_KEY = 'padel:locations';
const CACHE_EXPIRY = 60 * 60 * 24; // 24 hours in seconds

export async function GET() {
  try {
    let cachedLocations = await redis.get(CACHE_KEY);
    console.log('cachedLocations', cachedLocations);

    let locations: any[] = [];

    if (cachedLocations) {
      locations = JSON.parse(cachedLocations);
    } else {
      locations = [];
    }
    lg(`locations: ${locations.length}`);

    if (!locations || locations.length === 0) {
      lg('no cached data, scraping', 'red');
      locations = await scrapeVenues();
      lg(`locations after scrape: ${locations.length}`, 'green');
    }

    const venues = locations.map((location) => ({
      value: location.name.toLowerCase().replace(/\s+/g, '-'),
      label: location.name,
    }));

    return NextResponse.json(venues);
  } catch (error) {
    console.error('Error fetching venues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venues' },
      { status: 500 }
    );
  }
}

const scrapeVenues = async () => {
  // If no cached data, scrape the website
  const response = await scrapeWebsite('https://www.dpv-padel.de/standorte-2/');

  // Parse the response
  const rows = response.match(/<tr[^>]*>[\s\S]*?<\/tr>/g)?.slice(1) || [];
  //pop the first row
  rows.shift();
  const extractedLocations = [];

  for (const row of rows) {
    const firstCell = row.match(
      /<td[^>]*has-text-align-left[^>]*>([\s\S]*?)<\/td>/
    );

    if (firstCell) {
      lg(`firstCell: ${firstCell[1]}`, 'green');
      const cellContent = firstCell[1];

      const nameMatch = cellContent.match(/<strong>(.*?)<\/strong>/);
      const name = nameMatch ? nameMatch[1].trim() : '';

      const linkMatch = cellContent.match(/<a[^>]*href="([^"]*)"[^>]*>/);
      const link = linkMatch ? linkMatch[1] : '';

      let addressContent = cellContent
        .replace(/<strong>.*?<\/strong>/, '')
        .replace(/<a.*?<\/a>/, '');

      const addressLines = addressContent
        .split(/<br\/?>/g)
        .map((line) => line.trim().replace('<br />', ''))
        .filter((line) => line);

      if (name) {
        extractedLocations.push({ name, link, addressLines });
      }
    }
  }

  //sort location alphabetically by name
  extractedLocations.sort((a, b) => a.name.localeCompare(b.name));
  console.log('extractedLocations', extractedLocations);

  // Store in Redis with expiration
  await redis.setex(
    CACHE_KEY,
    CACHE_EXPIRY,
    JSON.stringify(extractedLocations)
  );

  return extractedLocations;
};
