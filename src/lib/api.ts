export const fetchVenues = async () => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/venues`
    );
    if (!response.ok) throw new Error('Failed to fetch venues');
    const data = await response.json();
    console.log('fetch venue data:', data);
    return data;
  } catch (error) {
    console.error(error);
  }
};
