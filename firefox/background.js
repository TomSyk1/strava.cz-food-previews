browser.runtime.onMessage.addListener((request, sender) => {
  if (request.action === "fetchFoodImage") {
    const query = request.query;

    // Check persistent browser storage first
    return browser.storage.local.get(query).then((result) => {
      if (result[query]) {
        return { url: result[query] };
      }

      // Fetch from DuckDuckGo if it's a new dish
      return fetchTopImage(query)
        .then(url => {
          if (url) {
            // Save to persistent storage cache
            browser.storage.local.set({ [query]: url });
          }
          return { url };
        })
        .catch(() => {
          return { url: null };
        });
    });
  }
});

async function fetchTopImage(query) {
  try {
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}+jidlo&iax=images&ia=images`;
    const response = await fetch(searchUrl);
    const text = await response.text();
    
    const vqdMatch = text.match(/vqd=["']?([^&"']+)["']?/i) || text.match(/vqd=([\d-]+)/);
    if (!vqdMatch) return null;
    const vqd = vqdMatch[1];

    const apiUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}+jidlo&o=json&vqd=${vqd}`;
    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    if (data && data.results && data.results.length > 0) {
      return data.results[0].image; 
    }
  } catch (e) {
    console.error("Fetch lookup failed for:", query, e);
  }
  return null;
}
