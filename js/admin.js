// Admin Module with Realtime Database

// Check admin access
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '/pages/admin/login.html';
        return;
    }

    const admin = await isAdmin(user.uid);
    if (!admin) {
        window.location.href = '/';
        return;
    }

    initializeAdminPanel();
});

function initializeAdminPanel() {
    const path = window.location.pathname;
    
    if (path.includes('dashboard.html')) {
        loadAdminDashboard();
    } else if (path.includes('manage-comics.html')) {
        loadComicsManagement();
    } else if (path.includes('manage-orders.html')) {
        loadOrdersManagement();
    } else if (path.includes('manage-users.html')) {
        loadUsersManagement();
    }
}

// Load admin dashboard
async function loadAdminDashboard() {
    try {
        await loadDashboardStats();
        await loadRecentOrders();
        await loadPopularComics();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        // Total comics
        const comicsSnapshot = await database.ref('comics').once('value');
        const comics = comicsSnapshot.val();
        document.getElementById('totalComics').textContent = comics ? Object.keys(comics).length : 0;

        // Total orders
        const ordersSnapshot = await database.ref('orders').once('value');
        const orders = ordersSnapshot.val();
        document.getElementById('totalOrders').textContent = orders ? Object.keys(orders).length : 0;

        // Total users
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val();
        document.getElementById('totalUsers').textContent = users ? Object.keys(users).length : 0;

        // Total revenue
        let revenue = 0;
        if (orders) {
            Object.values(orders).forEach(order => {
                revenue += order.total || 0;
            });
        }
        document.getElementById('totalRevenue').textContent = `$${revenue.toFixed(2)}`;

        // Today's orders
        const today = new Date().toDateString();
        let todayCount = 0;
        if (orders) {
            Object.values(orders).forEach(order => {
                if (order.createdAt && new Date(order.createdAt).toDateString() === today) {
                    todayCount++;
                }
            });
        }
        document.getElementById('todayOrders').textContent = todayCount;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent orders
async function loadRecentOrders() {
    try {
        const snapshot = await database.ref('orders')
            .orderByChild('createdAt')
            .limitToLast(5)
            .once('value');

        const tbody = document.getElementById('recentOrders');
        if (!tbody) return;

        const orders = snapshot.val();
        
        if (!orders) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No orders found</td></tr>';
            return;
        }

        // Convert to array and reverse to show newest first
        const ordersArray = Object.keys(orders).map(key => ({
            id: key,
            ...orders[key]
        })).reverse();

        tbody.innerHTML = '';

        for (const order of ordersArray) {
            const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
            
            // Get customer name
            let customerName = 'Unknown';
            if (order.userId) {
                const userSnapshot = await database.ref('users/' + order.userId).once('value');
                const userData = userSnapshot.val();
                if (userData) {
                    customerName = userData.displayName || userData.email || 'Unknown';
                }
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id.slice(0, 8)}...</td>
                <td>${customerName}</td>
                <td>$${order.total?.toFixed(2) || '0.00'}</td>
                <td><span class="status-badge status-${order.status || 'pending'}">${order.status || 'pending'}</span></td>
                <td>${date}</td>
                <td>
                    <button class="btn-icon" onclick="viewOrder('${order.id}')">👁️</button>
                    <button class="btn-icon" onclick="updateOrderStatus('${order.id}')">✏️</button>
                </td>
            `;
            tbody.appendChild(row);
        }

    } catch (error) {
        console.error('Error loading recent orders:', error);
    }
}

// Load popular comics
async function loadPopularComics() {
    try {
        const snapshot = await database.ref('comics')
            .orderByChild('featured')
            .equalTo(true)
            .limitToFirst(5)
            .once('value');

        const container = document.getElementById('popularComics');
        if (!container) return;

        const comics = snapshot.val();
        
        if (!comics) {
            container.innerHTML = '<p>No comics found</p>';
            return;
        }

        container.innerHTML = '';

        Object.keys(comics).forEach(key => {
            const comic = comics[key];
            const card = document.createElement('div');
            card.className = 'popular-comic-item';
            card.innerHTML = `
                <img src="${comic.imageUrl || '/assets/images/placeholder.jpg'}" alt="${comic.title}">
                <div>
                    <h4>${comic.title}</h4>
                    <p>${comic.author || 'Unknown'}</p>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading popular comics:', error);
    }
}

// Load comics management
async function loadComicsManagement() {
    try {
        const snapshot = await database.ref('comics')
            .orderByChild('createdAt')
            .once('value');

        const tbody = document.getElementById('comicsTableBody');
        if (!tbody) return;

        const comics = snapshot.val();
        
        if (!comics) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No comics found</td></tr>';
            return;
        }

        // Convert to array and reverse to show newest first
        const comicsArray = Object.keys(comics).map(key => ({
            id: key,
            ...comics[key]
        })).reverse();

        tbody.innerHTML = '';

        comicsArray.forEach(comic => {
            const date = comic.createdAt ? new Date(comic.createdAt).toLocaleDateString() : 'N/A';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${comic.imageUrl || '/assets/images/placeholder.jpg'}" 
                         alt="${comic.title}" 
                         class="comic-thumbnail"
                         style="width: 50px; height: 70px; object-fit: cover;">
                </td>
                <td>${comic.title}</td>
                <td>${comic.author || 'Unknown'}</td>
                <td>$${comic.price?.toFixed(2) || '0.00'}</td>
                <td>${comic.category || 'Uncategorized'}</td>
                <td>${comic.stock || 0}</td>
                <td>
                    <span class="badge ${comic.featured ? 'badge-success' : 'badge-secondary'}">
                        ${comic.featured ? 'Featured' : 'Regular'}
                    </span>
                </td>
                <td>${date}</td>
                <td>
                    <button class="btn-icon btn-edit" onclick="editComic('${comic.id}')" title="Edit">✏️</button>
                    <button class="btn-icon btn-delete" onclick="deleteComic('${comic.id}')" title="Delete">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading comics:', error);
    }
}

// Add comic
async function addComic(comicData) {
    try {
        if (!comicData.title || !comicData.price) {
            showNotification('Title and price are required', 'error');
            return false;
        }

        comicData.createdAt = new Date().toISOString();
        comicData.updatedAt = new Date().toISOString();

        const newComicRef = await database.ref('comics').push(comicData);

        showNotification('Comic added successfully!', 'success');
        await loadComicsManagement();
        
        return true;
    } catch (error) {
        console.error('Error adding comic:', error);
        showNotification('Error adding comic', 'error');
        return false;
    }
}

// Edit comic
async function editComic(comicId) {
    try {
        const snapshot = await database.ref('comics/' + comicId).once('value');
        const comic = snapshot.val();
        
        if (!comic) {
            showNotification('Comic not found', 'error');
            return;
        }

        document.getElementById('comicId').value = comicId;
        document.getElementById('title').value = comic.title || '';
        document.getElementById('author').value = comic.author || '';
        document.getElementById('price').value = comic.price || '';
        document.getElementById('category').value = comic.category || '';
        document.getElementById('description').value = comic.description || '';
        document.getElementById('imageUrl').value = comic.imageUrl || '';
        document.getElementById('stock').value = comic.stock || 0;
        document.getElementById('featured').checked = comic.featured || false;

        openModal('comicModal');
    } catch (error) {
        console.error('Error loading comic:', error);
        showNotification('Error loading comic', 'error');
    }
}

// Update comic
async function updateComic(comicId, comicData) {
    try {
        comicData.updatedAt = new Date().toISOString();

        await database.ref('comics/' + comicId).update(comicData);

        showNotification('Comic updated successfully!', 'success');
        await loadComicsManagement();
        closeModal('comicModal');
        
        return true;
    } catch (error) {
        console.error('Error updating comic:', error);
        showNotification('Error updating comic', 'error');
        return false;
    }
}

// Delete comic
async function deleteComic(comicId) {
    if (!confirm('Are you sure you want to delete this comic? This action cannot be undone.')) {
        return;
    }

    try {
        await database.ref('comics/' + comicId).remove();

        showNotification('Comic deleted successfully!', 'success');
        await loadComicsManagement();
    } catch (error) {
        console.error('Error deleting comic:', error);
        showNotification('Error deleting comic', 'error');
    }
}

// Load orders management
async function loadOrdersManagement() {
    try {
        const snapshot = await database.ref('orders')
            .orderByChild('createdAt')
            .once('value');

        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        const orders = snapshot.val();
        
        if (!orders) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
            return;
        }

        // Convert to array and reverse to show newest first
        const ordersArray = Object.keys(orders).map(key => ({
            id: key,
            ...orders[key]
        })).reverse();

        tbody.innerHTML = '';

        for (const order of ordersArray) {
            const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id.slice(0, 8)}...</td>
                <td>${order.userId?.slice(0, 8)}...</td>
                <td>${order.items?.length || 0}</td>
                <td>$${order.total?.toFixed(2) || '0.00'}</td>
                <td>
                    <select class="status-select" onchange="updateOrderStatus('${order.id}', this.value)">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>${date}</td>
                <td>
                    <button class="btn-icon" onclick="viewOrder('${order.id}')">👁️</button>
                </td>
            `;
            tbody.appendChild(row);
        }

    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        await database.ref('orders/' + orderId).update({
            status: newStatus,
            updatedAt: new Date().toISOString()
        });

        showNotification('Order status updated', 'success');
    } catch (error) {
        console.error('Error updating order:', error);
        showNotification('Error updating order', 'error');
    }
}

// Load users management
async function loadUsersManagement() {
    try {
        const snapshot = await database.ref('users')
            .orderByChild('createdAt')
            .once('value');

        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const users = snapshot.val();
        
        if (!users) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
            return;
        }

        // Convert to array and reverse to show newest first
        const usersArray = Object.keys(users).map(key => ({
            uid: key,
            ...users[key]
        })).reverse();

        tbody.innerHTML = '';

        usersArray.forEach(user => {
            const date = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.uid?.slice(0, 8)}...</td>
                <td>${user.displayName || 'N/A'}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${user.isAdmin ? 'badge-primary' : 'badge-secondary'}">
                        ${user.isAdmin ? 'Admin' : 'User'}
                    </span>
                </td>
                <td>${user.emailVerified ? '✅' : '❌'}</td>
                <td>${date}</td>
                <td>
                    <button class="btn-icon" onclick="toggleAdmin('${user.uid}', ${!user.isAdmin})">
                        ${user.isAdmin ? '👑' : '🤴'}
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteUser('${user.uid}')">
                        🗑️
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Toggle admin status
async function toggleAdmin(userId, makeAdmin) {
    try {
        await database.ref('users/' + userId).update({
            isAdmin: makeAdmin
        });

        showNotification(`User ${makeAdmin ? 'promoted to' : 'demoted from'} admin`, 'success');
        await loadUsersManagement();
    } catch (error) {
        console.error('Error toggling admin:', error);
        showNotification('Error updating user', 'error');
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }

    try {
        await database.ref('users/' + userId).remove();

        showNotification('User deleted', 'success');
        await loadUsersManagement();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Search comics
async function searchComics(query) {
    try {
        const snapshot = await database.ref('comics').once('value');
        const comics = snapshot.val();
        
        if (!comics) return [];

        const results = Object.keys(comics)
            .map(key => ({
                id: key,
                ...comics[key]
            }))
            .filter(comic => 
                comic.title?.toLowerCase().includes(query.toLowerCase())
            );

        displaySearchResults(results);
    } catch (error) {
        console.error('Error searching comics:', error);
    }
}

// Handle comic form submission
const comicForm = document.getElementById('comicForm');
if (comicForm) {
    comicForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const comicId = document.getElementById('comicId').value;
        const comicData = {
            title: document.getElementById('title').value,
            author: document.getElementById('author').value,
            price: parseFloat(document.getElementById('price').value),
            category: document.getElementById('category').value,
            description: document.getElementById('description').value,
            imageUrl: document.getElementById('imageUrl').value,
            stock: parseInt(document.getElementById('stock').value),
            featured: document.getElementById('featured').checked
        };

        const submitBtn = comicForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        let success;
        if (comicId) {
            success = await updateComic(comicId, comicData);
        } else {
            success = await addComic(comicData);
        }

        if (success) {
            comicForm.reset();
            document.getElementById('comicId').value = '';
        }

        submitBtn.disabled = false;
        submitBtn.textContent = comicId ? 'Update Comic' : 'Add Comic';
    });
}

// View order function
function viewOrder(orderId) {
    alert(`View order: ${orderId} (Demo)`);
}

// Export functions
window.addComic = addComic;
window.editComic = editComic;
window.deleteComic = deleteComic;
window.updateOrderStatus = updateOrderStatus;
window.toggleAdmin = toggleAdmin;
window.deleteUser = deleteUser;
window.openModal = openModal;
window.closeModal = closeModal;
window.viewOrder = viewOrder;