const imageCache = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchFoodImage") {
    const query = request.query;
    
    // If we already have this food item cached, return it instantly
    if (imageCache[query]) {
      sendResponse({ url: imageCache[query] });
    } else {
      // Otherwise, execute the background search engine query safely
      fetchTopImage(query)
        .then(url => {
          if (url) imageCache[query] = url;
          sendResponse({ url });
        })
        .catch(() => sendResponse({ url: null }));
        
      return true; // Keeps the messaging pipeline active for async fetch returns
    }
  }
});

async function fetchTopImage(query) {
  try {
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}+jidlo&iax=images&ia=images`;
    const response = await fetch(searchUrl);
    const text = await response.text();
    
    const vqdMatch = text.match(/vqd=([\d-]+)/);
    if (!vqdMatch) return null;
    const vqd = vqdMatch[1];

    const apiUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}+jidlo&o=json&vqd=${vqd}`;
    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    if (data && data.results && data.results.length > 0) {
      return data.results[0].image;
    }
  } catch (error) {
    console.error("Failed fetching live image:", error);
  }
  return null;
}
