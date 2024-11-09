import axios from "axios"

export const scrapeWebsite = async (url: string) => {
    const urlencodedUrl = encodeURIComponent(url);
    try {
      const response = await axios.get(
        `https://api.scraperapi.com/?api_key=1a33e1ce7aafebf2f0d9e318b485cbc9&url=${urlencodedUrl}&country_code=eu`
      );
      if (response.status !== 200) {
        console.log('Response not ok:', response.status);
        return null;
      }

      if (response.data.length === 0) {
        return null
      }

      console.log('Response:', response.data);
      return response.data
  
    } catch (error: any) {
      console.error(`Error scraping url: ${url}`);
      throw error;
    }
  }