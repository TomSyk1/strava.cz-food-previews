function cleanFoodName(text) {
  if (!text.includes("-")) return null;
  let structuralPart = text.split("-")[1];
  if (!structuralPart) return null;
  
  let query = structuralPart.split(/[,;]/)[0].trim();
  
  // Strip out common weight/size indicators (e.g., 150g, 0,3l, 2ks)
  query = query.replace(/\d+\s*(g|l|ks|ks\.?)/i, '');
  // Strip out layout-specific trailing shorthand acronyms like "m.m." (mleté maso)
  query = query.replace(/\b(m\.m\.)\b/gi, '');
  // Remove brackets and parenthetical symbols completely
  query = query.replace(/[\/\\\(\)]/g, '');
  
  return query.trim();
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

    if (document.body.contains(task.element) && !task.element.querySelector('.food-preview-img')) {
      
      browser.runtime.sendMessage({ action: "fetchFoodImage", query: task.query })
        .then((response) => {
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
              
              // Smooth scale transitions for hover effects
              img.style.transition = 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out';
              img.style.cursor = 'pointer';
              
              img.onmouseenter = () => {
                img.style.transform = 'scale(1.06)';
                img.style.boxShadow = '0 6px 12px rgba(0,0,0,0.5)';
              };
              img.onmouseleave = () => {
                img.style.transform = 'scale(1)';
                img.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
              };
              
              img.onerror = () => {
                img.src = "https://placehold.co/150x100?text=No+Photo";
              };

              task.element.style.minHeight = '116px'; 
              task.element.style.display = 'flex';
              task.element.style.alignItems = 'center';

              task.element.prepend(img);
            }
          }
        })
        .catch((err) => console.debug("Bypassed dynamic channel tick:", err));
    }

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
  updateDebouncer = setTimeout(injectFoodImages, 300);
});

observer.observe(document.body, { childList: true, subtree: true });

injectFoodImages();
