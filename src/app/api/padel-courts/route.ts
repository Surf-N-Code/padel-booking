import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';
import { scrapeWebsite } from '@/lib/scrape';
import { lg } from '@/lib/utils';

const CACHE_KEY = 'padel:locations';
const CACHE_EXPIRY = 60 * 60 * 24; // 24 hours in seconds

export async function GET() {
  try {
    // Try to get cached data
    let cachedLocations = await redis.get(CACHE_KEY);
    let locations: any[] = [];

    if (cachedLocations) {
      locations = JSON.parse(cachedLocations);
    } else {
      locations = [];
    }
    lg(`locations: ${locations.length}`);

    if (!locations || locations.length == 0) {
      lg('no cached data, scraping', 'red');
      // If no cached data, scrape the website
      const response = await scrapeWebsite(
        'https://www.dpv-padel.de/standorte-2/'
      );

      // Parse the response
      const rows = response.match(/<tr[^>]*>[\s\S]*?<\/tr>/g)?.slice(1) || [];
      const extractedLocations = [];

      let idx = 0;
      for (const row of rows) {
        // if (idx === 0) {
        //   break;
        // }
        const firstCell = row.match(
          /<td[^>]*has-text-align-left[^>]*>([\s\S]*?)<\/td>/
        );

        if (firstCell) {
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
        // idx++;
      }

      // Store in Redis with expiration
      await redis.setex(
        CACHE_KEY,
        CACHE_EXPIRY,
        JSON.stringify(extractedLocations)
      );

      locations = extractedLocations;
    }

    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching padel locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
