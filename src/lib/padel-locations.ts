import fs from 'fs/promises';
import path from 'path';

interface PadelLocation {
  name: string;
  link: string;
  addressLines: string[];
}

const LOCATIONS_FILE = path.join(process.cwd(), 'data', 'padel-locations.json');

export async function savePadelLocations(
  locations: PadelLocation[]
): Promise<void> {
  try {
    // Ensure the data directory exists
    await fs.mkdir(path.dirname(LOCATIONS_FILE), { recursive: true });

    // Write the locations to file
    await fs.writeFile(LOCATIONS_FILE, JSON.stringify(locations, null, 2));
  } catch (error) {
    console.error('Error saving padel locations:', error);
    throw error;
  }
}

export async function readPadelLocations(): Promise<PadelLocation[]> {
  try {
    const data = await fs.readFile(LOCATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return empty array if file doesn't exist or is invalid
    return [];
  }
}
