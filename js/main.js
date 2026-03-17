// Main Application Module with Realtime Database

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

function initializeApp() {
    const savedTheme = localStorage.getItem('comicverse_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }

    loadHeader();
    loadFooter();
    initMobileMenu();
    initSearch();
}

function loadHeader() {
    updateAuthUI();
}

function loadFooter() {}

function setupEventListeners() {
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });
        
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

async function loadInitialData() {
    await loadFeaturedComics();
    await loadBlogPosts();
}

// Load featured comics from Realtime Database
async function loadFeaturedComics() {
    try {
        const snapshot = await database.ref('comics')
            .orderByChild('featured')
            .equalTo(true)
            .limitToFirst(8)
            .once('value');

        const comicsGrid = document.getElementById('featuredComics');
        if (!comicsGrid) return;

        comicsGrid.innerHTML = '';

        const comics = snapshot.val();
        
        if (!comics) {
            comicsGrid.innerHTML = '<p class="no-results">No featured comics available</p>';
            return;
        }

        // Convert object to array
        Object.keys(comics).forEach(key => {
            const comic = { id: key, ...comics[key] };
            const comicCard = createComicCard(comic);
            comicsGrid.appendChild(comicCard);
        });

    } catch (error) {
        console.error('Error loading featured comics:', error);
        showNotification('Error loading comics', 'error');
    }
}

// Create comic card element
function createComicCard(comic) {
    const card = document.createElement('div');
    card.className = 'comic-card';
    card.setAttribute('data-id', comic.id);
    
    card.innerHTML = `
        <div class="comic-card-inner">
            <img src="${comic.imageUrl || '/assets/images/placeholder.jpg'}" 
                 alt="${comic.title}"
                 loading="lazy"
                 onerror="this.src='/assets/images/placeholder.jpg'">
            <div class="comic-info">
                <h3 class="comic-title">${comic.title}</h3>
                <p class="comic-author">by ${comic.author || 'Unknown'}</p>
                <p class="comic-price">$${comic.price?.toFixed(2) || '0.00'}</p>
                <div class="comic-actions">
                    <button class="btn btn-primary add-to-cart" onclick="event.stopPropagation(); cart.addItem('${comic.id}')">
                        Add to Cart
                    </button>
                    <button class="btn btn-secondary view-details" onclick="window.location.href='/pages/product.html?id=${comic.id}'">
                        Details
                    </button>
                </div>
            </div>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn')) {
            window.location.href = `/pages/product.html?id=${comic.id}`;
        }
    });

    return card;
}

// Load blog posts from Realtime Database
async function loadBlogPosts() {
    try {
        const snapshot = await database.ref('blog')
            .orderByChild('createdAt')
            .limitToLast(3)
            .once('value');

        const blogGrid = document.getElementById('blogPreview');
        if (!blogGrid) return;

        blogGrid.innerHTML = '';

        const posts = snapshot.val();
        
        if (!posts) {
            blogGrid.innerHTML = '<p class="no-results">No blog posts available</p>';
            return;
        }

        // Convert to array and reverse to show newest first
        const postsArray = Object.keys(posts).map(key => ({
            id: key,
            ...posts[key]
        })).reverse();

        postsArray.forEach(post => {
            const postCard = createBlogCard(post);
            blogGrid.appendChild(postCard);
        });

    } catch (error) {
        console.error('Error loading blog posts:', error);
    }
}

// Create blog card
function createBlogCard(post) {
    const card = document.createElement('article');
    card.className = 'blog-card';
    
    const date = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'No date';
    
    card.innerHTML = `
        <img src="${post.imageUrl || '/assets/images/blog-placeholder.jpg'}" 
             alt="${post.title}"
             loading="lazy"
             onerror="this.src='/assets/images/blog-placeholder.jpg'">
        <div class="blog-content">
            <p class="blog-meta">${date} | ${post.category || 'Comic News'}</p>
            <h3 class="blog-title">${post.title}</h3>
            <p class="blog-excerpt">${post.excerpt || ''}</p>
            <a href="/pages/blog/post.html?id=${post.id}" class="btn btn-outline">Read More</a>
        </div>
    `;

    return card;
}

function updateAuthUI() {
    const authLinks = document.getElementById('authLinks');
    if (!authLinks) return;

    const user = auth.currentUser;

    if (user) {
        authLinks.innerHTML = `
            <a href="/pages/dashboard.html" class="btn-dashboard">Dashboard</a>
            <button onclick="logout()" class="btn-logout">Logout</button>
        `;
    } else {
        authLinks.innerHTML = `
            <a href="/pages/login.html" class="btn-login">Login</a>
            <a href="/pages/signup.html" class="btn-signup">Sign Up</a>
        `;
    }
}

// Newsletter subscription
async function handleNewsletterSubmit(e) {
    e.preventDefault();
    
    const email = e.target.querySelector('input[type="email"]').value;
    
    try {
        await database.ref('newsletter').push({
            email: email,
            subscribedAt: new Date().toISOString()
        });
        
        showNotification('Successfully subscribed to newsletter!', 'success');
        e.target.reset();
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        showNotification('Error subscribing to newsletter', 'error');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('comicverse_theme', isLight ? 'light' : 'dark');
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = isLight ? '🌙' : '☀️';
    }
}

function initMobileMenu() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');

    if (mobileBtn && navMenu) {
        mobileBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileBtn.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !mobileBtn.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileBtn.classList.remove('active');
            }
        });
    }
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    if (!searchInput) return;

    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();

        if (query.length < 2) {
            if (searchResults) searchResults.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(() => performSearch(query), 300);
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults?.contains(e.target)) {
            if (searchResults) searchResults.style.display = 'none';
        }
    });
}

// Search function
async function performSearch(query) {
    try {
        const snapshot = await database.ref('comics').once('value');
        const comics = snapshot.val();
        
        if (!comics) {
            document.getElementById('searchResults').innerHTML = '<div class="search-no-results">No comics found</div>';
            return;
        }

        const results = Object.keys(comics)
            .map(key => ({
                id: key,
                ...comics[key]
            }))
            .filter(comic => 
                comic.title?.toLowerCase().includes(query.toLowerCase()) ||
                comic.author?.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 5);

        const searchResults = document.getElementById('searchResults');
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">No comics found</div>';
        } else {
            let html = '';
            results.forEach(comic => {
                html += `
                    <div class="search-result-item" onclick="window.location.href='/pages/product.html?id=${comic.id}'">
                        <img src="${comic.imageUrl || '/assets/images/placeholder.jpg'}" alt="${comic.title}">
                        <div>
                            <h4>${comic.title}</h4>
                            <p>${comic.author || 'Unknown'}</p>
                        </div>
                    </div>
                `;
            });
            searchResults.innerHTML = html;
        }

        searchResults.style.display = 'block';
    } catch (error) {
        console.error('Search error:', error);
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}