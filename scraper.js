const axios = require('axios');
const fs = require('fs');
const xml2js = require('xml2js');

async function buildSource() {
  console.log("Fetching OvaGames feed...");
  
  const response = await axios.get('https://www.ovagames.com/feed', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });

  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(response.data);
  const items = result.rss.channel[0].item;

  const downloads = items.map(item => {
    const title = item.title[0];
    const link = item.link[0];
    const pubDate = new Date(item.pubDate[0]).toISOString();
    
    let fileSize = "Unknown";
    const desc = item.description ? item.description[0] : "";
    const sizeMatch = desc.match(/File Size:\s*([0-9\.]+\s*[M|G]B)/i);
    if (sizeMatch) {
      fileSize = sizeMatch[1];
    }

    return {
      title: title,
      uris: [link],
      uploadDate: pubDate,
      fileSize: fileSize
    };
  });

  const hydraSource = {
    name: "OvaGames Auto Source",
    downloads: downloads
  };

  fs.writeFileSync('source.json', JSON.stringify(hydraSource, null, 2));
  console.log(`Saved ${downloads.length} games to source.json`);
}

buildSource().catch(err => {
  console.error(err);
  process.exit(1);
});
