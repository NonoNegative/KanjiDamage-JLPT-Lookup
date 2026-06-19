let allData = [];
let filteredData = [];
let currentPage = 1;

// DOM Elements
const jlptSelect = document.getElementById('jlptSelect');
const sortSelect = document.getElementById('sortSelect');
const perPageSelect = document.getElementById('perPageSelect');
const themeSelect = document.getElementById('themeSelect');
const showMeaningCheck = document.getElementById('showMeaningCheck');
const kanjiGrid = document.getElementById('kanjiGrid');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const iframeContainer = document.getElementById('iframeContainer');
const kanjiFrame = document.getElementById('kanjiFrame');
const unknownMessage = document.getElementById('unknownMessage');
const optionsBtn = document.getElementById('optionsBtn');
const optionsPanel = document.getElementById('optionsPanel');
const optionsBackdrop = document.getElementById('optionsBackdrop');
const closeOptionsBtn = document.getElementById('closeOptionsBtn');
const widthSlider = document.getElementById('widthSlider');

async function init() {
    try {
        const response = await fetch('kanjidamage_lookup.json');
        const json = await response.json();
        
        // Convert Object to Array
        allData = Object.keys(json).map(key => ({
            kanji: key,
            ...json[key]
        }));
        
        attachEventListeners();
        applyFilters();
    } catch (err) {
        console.error("Failed to load kanji data:", err);
        kanjiGrid.innerHTML = "Error loading data. Make sure kanjidamage_lookup.json exists and you are running via a local web server.";
    }
}

function attachEventListeners() {
    jlptSelect.addEventListener('change', () => {
        currentPage = 1;
        applyFilters();
    });
    
    sortSelect.addEventListener('change', () => {
        currentPage = 1;
        applyFilters();
    });
    
    perPageSelect.addEventListener('change', () => {
        currentPage = 1;
        renderGrid();
    });
    
    showMeaningCheck.addEventListener('change', renderGrid);
    
    themeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderGrid();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const perPage = parseInt(perPageSelect.value, 10);
        const maxPage = Math.ceil(filteredData.length / perPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderGrid();
        }
    });

    optionsBtn.addEventListener('click', () => {
        const opening = optionsPanel.classList.contains('hidden');
        if (opening) openOptions(); else closeOptions();
    });

    widthSlider.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--app-max-width', `${e.target.value}px`);
    });

    closeOptionsBtn.addEventListener('click', closeOptions);
    optionsBackdrop.addEventListener('click', closeOptions);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !optionsPanel.classList.contains('hidden')) {
            closeOptions();
        }
    });

    // Resize iframe internally avoiding the inner scrollbar
    kanjiFrame.addEventListener('load', function() {
        if (!this.src || this.src.includes('about:blank')) return;
        try {
            // briefly shrink to compute new expanded height correctly if it got smaller
            this.style.height = '10px';
            const doc = this.contentWindow.document;
            const newHeight = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
            this.style.height = newHeight + 'px';
        } catch (err) {
            console.error('Cannot dynamically resize iframe (CORS or similar issue)', err);
        }
    });
}

function openOptions() {
    optionsPanel.classList.remove('hidden');
    optionsBackdrop.classList.remove('hidden');
    // prevent page scroll while modal open
    document.body.style.overflow = 'hidden';
    // focus slider for immediate dragging
    widthSlider.focus();
}

function closeOptions() {
    optionsPanel.classList.add('hidden');
    optionsBackdrop.classList.add('hidden');
    document.body.style.overflow = '';
}

function applyFilters() {
    const jlptValue = jlptSelect.value;
    
    // Filter
    filteredData = allData.filter(item => {
        if (jlptValue === 'all') return true;
        // item.jlpt can be null or number
        return item.jlpt == jlptValue; 
    });

    // Sort
    const sortValue = sortSelect.value;
    filteredData.sort((a, b) => {
        if (sortValue === 'frequency') {
            // Lower number = higher frequency. Handle nulls safely (push to bottom)
            const freqA = a.freq_mainichi_shinbun ?? Infinity;
            const freqB = b.freq_mainichi_shinbun ?? Infinity;
            return freqA - freqB;
        } else if (sortValue === 'strokes') {
            const strokeA = a.stroke_count ?? 0;
            const strokeB = b.stroke_count ?? 0;
            return strokeA - strokeB;
        }
        return 0;
    });

    renderGrid();
}

function renderGrid() {
    kanjiGrid.innerHTML = '';
    
    const perPage = parseInt(perPageSelect.value, 10);
    const maxPage = Math.ceil(filteredData.length / perPage) || 1;
    
    if (currentPage > maxPage) {
        currentPage = maxPage;
    }
    
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, filteredData.length);
    
    const visibleData = filteredData.slice(startIndex, endIndex);

    const showMeaning = showMeaningCheck.checked;

    visibleData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'kanji-card';
        
        const charDiv = document.createElement('div');
        charDiv.className = 'kanji-char';
        charDiv.textContent = item.kanji;
        card.appendChild(charDiv);
        
        if (showMeaning && item.en_meaning) {
            const meaningDiv = document.createElement('div');
            meaningDiv.className = 'kanji-meaning';
            meaningDiv.textContent = item.en_meaning;
            card.appendChild(meaningDiv);
        }

        card.addEventListener('click', () => {
            // Remove selection from all cards
            document.querySelectorAll('.kanji-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            showIframeContent(item.id);
        });

        kanjiGrid.appendChild(card);
    });

    // Update pagination UI
    pageInfo.textContent = `Page ${currentPage} of ${maxPage} (${filteredData.length} Kanji)`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === maxPage;
}

function showIframeContent(id) {
    if (!id || id === 'unknown') {
        kanjiFrame.classList.add('hidden');
        kanjiFrame.src = 'about:blank';
        unknownMessage.classList.remove('hidden');
    } else {
        unknownMessage.classList.add('hidden');
        kanjiFrame.classList.remove('hidden');
        // Point the iframe relative to our own server, which will proxy it and strip the frame protection
        kanjiFrame.src = `/kanji/${id}`;
    }
}

// Start
init();