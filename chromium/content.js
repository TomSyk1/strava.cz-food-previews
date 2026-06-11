function cleanFoodName(text) {
  if (!text.includes("-")) return null;
  let structuralPart = text.split("-")[1];
  if (!structuralPart) return null;
  return structuralPart.split(/[,;]/)[0].trim();
}

const executionQueue = [];
let queueIsProcessing = false;

function runSequentialQueue() {
  if (queueIsProcessing || executionQueue.length === 0) return;
  queueIsProcessing = true;

  function processNext() {
    if (executionQueue.length === 0) {
      queueIsProcessing = false;
      return;
    }

    const task = executionQueue.shift();

    // Check if the element is still active and hasn't received an image yet
    if (document.body.contains(task.element) && !task.element.querySelector('.food-preview-img')) {
      
      // Fire the request asynchronously (No 'await' blocking the queue loop!)
      chrome.runtime.sendMessage({ action: "fetchFoodImage", query: task.query }, (response) => {
        if (response && response.url && document.body.contains(task.element)) {
          if (!task.element.querySelector('.food-preview-img')) {
            const img = document.createElement('img');
            img.src = response.url;
            img.className = 'food-preview-img';
            
            img.style.width = '150px';
            img.style.height = '100px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '8px';
            img.style.marginRight = '16px';
            img.style.marginLeft = '6px';
            img.style.display = 'inline-block';
            img.style.verticalAlign = 'middle';
            img.style.border = '1px solid rgba(255,255,255,0.15)';
            img.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
            
            img.onerror = () => {
              img.src = "https://placehold.co/150x100?text=No+Photo";
            };

            task.element.style.minHeight = '116px'; 
            task.element.style.display = 'flex';
            task.element.style.alignItems = 'center';

            task.element.prepend(img);
          }
        }
      });
    }

    // Stagger the next execution start by 250ms to keep search engines happy,
    // allowing all requests to run concurrently in the background!
    setTimeout(processNext, 250);
  }

  processNext();
}

function injectFoodImages() {
  const candidates = Array.from(document.querySelectorAll('div[role="checkbox"], label')).filter(el => {
    return el.textContent.includes("Oběd") && el.textContent.includes("-");
  });

  const trueRows = candidates.filter(el => {
    return !candidates.some(innerElement => innerElement !== el && el.contains(innerElement));
  });

  trueRows.forEach(row => {
    if (row.querySelector('.food-preview-img') || row.hasAttribute('data-loading-img')) return;

    const foodQuery = cleanFoodName(row.textContent || "");
    if (!foodQuery) return;

    row.setAttribute('data-loading-img', 'true');
    executionQueue.push({ element: row, query: foodQuery });
  });

  runSequentialQueue();
}

let updateDebouncer;
const observer = new MutationObserver(() => {
  clearTimeout(updateDebouncer);
  updateDebouncer = setTimeout(injectFoodImages, 100);
});

observer.observe(document.body, { childList: true, subtree: true });
injectFoodImages();
