// Get the API key
const API_KEY = "AIzaSyC-HlSnwYu-8fRVvwx497xV1mwsf9CB8KQ";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Get search query from URL
const urlParams = new URLSearchParams(window.location.search);
const searchQuery = urlParams.get('q');
// Change from single image to array
let searchImages = JSON.parse(sessionStorage.getItem('searchImages')) || [];

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');

    // Set the search query in the input field
    if (searchQuery) {
        searchInput.value = searchQuery;
        document.title = `${searchQuery} - Google Search`;
        clearSearch.style.display = 'block';

        // Display existing images
        if (searchImages.length > 0) {
            updateImagePreviews();
        }

        // Update the page with search results
        fetchAIOverview(searchQuery);
        generateSearchResults(searchQuery);

        // Show approximate result stats
        const resultCount = Math.floor(Math.random() * (1000000 - 100000) + 100000);
        const searchTime = (Math.random() * (1.5 - 0.3) + 0.3).toFixed(2);
        document.getElementById('resultStats').textContent = `About ${resultCount.toLocaleString()} results (${searchTime} seconds)`;
    }

    // Handle clear search button
    clearSearch.addEventListener('click', function () {
        searchInput.value = '';
        searchInput.focus();
        clearSearch.style.display = 'none';
    });

    // Show/hide clear button based on input
    searchInput.addEventListener('input', function () {
        clearSearch.style.display = this.value ? 'block' : 'none';
    });

    // Handle Enter key for new searches
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const newQuery = searchInput.value.trim();

            // Update loading state
            document.getElementById('aiOverviewContent').innerHTML = '<div class="loading">Loading AI Overview...</div>';
            document.getElementById('aiOverview').style.display = 'block';

            // Update title and URL without reloading
            document.title = `${newQuery} - Google Search`;
            if (newQuery) {
                const newUrl = `search.html?q=${encodeURIComponent(newQuery)}`;
                window.history.pushState({}, '', newUrl);
            }

            // Generate new search results and fetch AI overview with the query and image
            generateSearchResults(newQuery);
            fetchAIOverview(newQuery);

            // Update result stats
            const resultCount = Math.floor(Math.random() * (1000000 - 100000) + 100000);
            const searchTime = (Math.random() * (1.5 - 0.3) + 0.3).toFixed(2);
            document.getElementById('resultStats').textContent = `About ${resultCount.toLocaleString()} results (${searchTime} seconds)`;
        }
    });

    // Remove pasted image
    document.getElementById('removeImage').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling up
        searchImage = null;
        sessionStorage.removeItem('searchImage');
        document.getElementById('imagePreviewContainer').style.display = 'none';
    });

    // Show more button functionality
    document.getElementById('showMoreBtn').addEventListener('click', function () {
        const content = document.getElementById('aiOverviewContent');
        content.classList.toggle('expanded');

        if (content.classList.contains('expanded')) {
            this.innerHTML = '<span>Show less</span><i class="material-icons">expand_less</i>';
        } else {
            this.innerHTML = '<span>Show more</span><i class="material-icons">expand_more</i>';
        }
    });
});

// Modify the paste event handler
searchInput.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1 && searchImages.length < 3) {
            const blob = items[i].getAsFile();
            const reader = new FileReader();

            reader.onload = function (event) {
                searchImages.push(event.target.result);
                sessionStorage.setItem('searchImages', JSON.stringify(searchImages));
                updateImagePreviews();
            };

            reader.readAsDataURL(blob);
        }
    }
});

// New function to update image previews
function updateImagePreviews() {
    const container = document.getElementById('imagePreviewsContainer');
    container.innerHTML = '';

    searchImages.forEach((imageData, index) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview-container';
        preview.innerHTML = `
            <img src="${imageData}" class="image-preview">
            <div class="remove-image" data-index="${index}">
                <i class="material-icons" style="font-size: 10px;">close</i>
            </div>
        `;
        container.appendChild(preview);
    });

    // Add event listeners for remove buttons
    document.querySelectorAll('.remove-image').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            searchImages.splice(index, 1);
            sessionStorage.setItem('searchImages', JSON.stringify(searchImages));
            updateImagePreviews();
        });
    });
}

// Fetch AI Overview from Gemini API
async function fetchAIOverview(query) {
    try {
        document.getElementById('aiOverview').style.display = 'block';

        const data = {
            contents: [{
                parts: [
                    { text: query || "What's in these images?" }
                ]
            }]
        };

        // Add all images
        searchImages.forEach(image => {
            const imageBase64 = image.split(',')[1];
            data.contents[0].parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: imageBase64
                }
            });
        });

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();

        try {
            const markdownContent = result.candidates[0].content.parts[0].text;

            // Convert markdown to HTML (basic conversion)
            let htmlContent = markdownContent
                // Convert headers
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                // Convert bold
                .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
                .replace(/__(.*?)__/gim, '<strong>$1</strong>')
                // Convert italic
                .replace(/\*(.*?)\*/gim, '<em>$1</em>')
                .replace(/_(.*?)_/gim, '<em>$1</em>')
                // Convert lists
                .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
                .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
                .replace(/^(\d+)\. (.*$)/gim, '<ol><li>$2</li></ol>')
                // Fix duplicate list tags
                .replace(/<\/ul><ul>/gim, '')
                .replace(/<\/ol><ol>/gim, '')
                // Convert paragraphs
                .replace(/\n\s*\n/gim, '</p><p>')
                // Line breaks
                .replace(/\n/gim, '<br>');

            // Wrap with paragraph if needed
            if (!htmlContent.startsWith('<h') && !htmlContent.startsWith('<p')) {
                htmlContent = '<p>' + htmlContent + '</p>';
            }

            // Update the AI Overview section
            const aiContent = document.getElementById('aiOverviewContent');
            aiContent.innerHTML = htmlContent;

        } catch (e) {
            console.error('Error parsing API response:', e);
            document.getElementById('aiOverviewContent').innerHTML = '<p>Unable to generate AI overview at this time.</p>';
        }

    } catch (error) {
        console.error('Error fetching AI Overview:', error);
        document.getElementById('aiOverviewContent').innerHTML = '<p>Unable to generate AI overview at this time.</p>';
    }
}

// Generate dummy search results based on the query
function generateSearchResults(query) {
    var query = query.slice(0, 10);
    const searchResultsContainer = document.getElementById('searchResults');

    // Create dummy search results
    const domains = [
        { name: 'wikipedia', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}` },
        { name: 'urbandictionary', url: `https://www.urbandictionary.com/define.php?term=${encodeURIComponent(query)}` },
        {
            name: query.toLowerCase().replace(/\s+/g, ''),
            url: `https://${query.toLowerCase().replace(/\s+/g, '')}.com`
        },
        { name: 'dictionary', url: `https://www.dictionary.com/browse/${encodeURIComponent(query)}` },
        { name: 'britannica', url: `https://www.britannica.com/search?query=${encodeURIComponent(query)}` }
    ];

    let resultsHTML = '';

    // Wikipedia result
    resultsHTML += `
        <div class="result-item">
            <div class="result-url">
                <img src="https://www.google.com/s2/favicons?domain=en.wikipedia.org" alt="Wikipedia favicon">
                <span>en.wikipedia.org › wiki › ${query}</span>
            </div>
            <a href="${domains[0].url}" class="result-title">${query} - Wikipedia</a>
            <div class="result-description">
                ${query} is a term that refers to various concepts, people, or things depending on context. 
                This article covers the history, significance, and various interpretations of ${query} 
                across different cultures and time periods.
            </div>
        </div>
    `;

    // Urban Dictionary result
    resultsHTML += `
        <div class="result-item">
            <div class="result-url">
                <img src="https://www.google.com/s2/favicons?domain=urbandictionary.com" alt="Urban Dictionary favicon">
                <span>urbandictionary.com › define › term=${query}</span>
            </div>
            <a href="${domains[1].url}" class="result-title">${query} - Urban Dictionary</a>
            <div class="result-description">
                The top definition for ${query} on Urban Dictionary describes it as something highly regarded 
                in modern culture. Many users have contributed their interpretations of what ${query} means in 
                contemporary slang and everyday usage.
            </div>
        </div>
    `;

    // Official website
    resultsHTML += `
        <div class="result-item">
            <div class="result-url">
                <img src="https://www.mcdonalds.com.my/images/favicon.ico" alt="${query} favicon">
                <span>${domains[2].name}.com</span>
            </div>
            <a href="${domains[2].url}" class="result-title">${query} - Official Website</a>
            <div class="result-description">
                The official website for all things ${query}. Explore products, services, and latest news 
                related to ${query}. Find comprehensive information about ${query} and why it matters 
                in today's world.
            </div>
        </div>
    `;

    // Dictionary result    
    resultsHTML += `
        <div class="result-item">
            <div class="result-url">
                <img src="https://www.google.com/s2/favicons?domain=dictionary.com" alt="Dictionary.com favicon">
                <span>dictionary.com › browse › ${query}</span>
            </div>
            <a href="${domains[3].url}" class="result-title">Meaning of ${query} | Dictionary.com</a>
            <div class="result-description">
                ${query} definition, the act of defining or making definite, distinct, or clear. 
                See more definitions, examples, and related words at Dictionary.com, the world's 
                most trusted free online dictionary.
            </div>
        </div>
    `;

    // Encyclopedia result
    resultsHTML += `
        <div class="result-item">
            <div class="result-url">
                <img src="https://www.google.com/s2/favicons?domain=britannica.com" alt="Britannica favicon">
                <span>britannica.com › search › ${query}</span>
            </div>
            <a href="${domains[4].url}" class="result-title">${query} | Encyclopedia Britannica</a>
            <div class="result-description">
                Learn about ${query} in this article covering its origins, development, and significance. 
                Explore related topics and discover how ${query} has influenced various aspects of 
                society throughout history.
            </div>
        </div>
    `;

    searchResultsContainer.innerHTML = resultsHTML;
}