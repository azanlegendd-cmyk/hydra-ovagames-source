const axios = require('axios');
const fs = require('fs');

async function buildSource() {
  console.log("Starting full OvaGames scrape via WordPress REST API...");
  
  let allDownloads = [];
  let page = 1;

  while (true) {
    console.log(`Fetching page ${page}...`);
    try {
      // Pull 100 posts per page directly from backend database
      const url = `https://www.ovagames.com/wp-json/wp/v2/posts?per_page=100&page=${page}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const posts = response.data;
      if (!posts || posts.length === 0) break;

      for (const post of posts) {
        // Clean up title encoding
        const title = post.title.rendered
          .replace(/&#8211;/g, '-')
          .replace(/&#8217;/g, "'")
          .replace(/&amp;/g, '&');
          
        const content = post.content.rendered;

        // 1. Extract File Size from post HTML
        let fileSize = "Unknown";
        const sizeMatch = content.match(/File Size:\s*([0-9\.]+\s*[M|G]B)/i);
        if (sizeMatch) {
          fileSize = sizeMatch[1];
        }

        // 2. Extract actual hoster/mirror links inside post HTML
        const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
        let uris = [];
        let match;
        
        while ((match = linkRegex.exec(content)) !== null) {
          const href = match[1];
          // Filter out internal site links to keep only external download mirrors
          if (!href.includes('ovagames.com') && 
              !href.includes('wordpress.org') && 
              !href.includes('w.org') &&
              !href.includes('schema.org')) {
            uris.push(href);
          }
        }

        // Only add entries if download links were successfully extracted
        if (uris.length > 0) {
          allDownloads.push({
            title: title,
            uris: uris,
            uploadDate: new Date(post.date).toISOString(),
            fileSize: fileSize
          });
        }
      }

      page++;

    } catch (error) {
      // WordPress returns a 400 error when page count exceeds total available pages
      if (error.response && (error.response.status === 400 || error.response.status === 404)) {
        console.log("Reached the end of available posts on OvaGames.");
      } else {
        console.error(`Stopped on page ${page}:`, error.message);
      }
      break;
    }
  }

  const hydraSource = {
    name: "OvaGames Full Source",
    downloads: allDownloads
  };

  fs.writeFileSync('source.json', JSON.stringify(hydraSource, null, 2));
  console.log(`Success! Saved ${allDownloads.length} total games with direct mirror links to source.json`);
}

buildSource();
