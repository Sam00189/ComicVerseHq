// Cart Module (FULL FIXED VERSION)

class Cart {
    constructor() {
        this.items = [];
        this.loadCart();
    }

    // Load from localStorage
    loadCart() {
        const saved = localStorage.getItem('comicverse_cart');
        if (saved) {
            try {
                this.items = JSON.parse(saved);
            } catch {
                this.items = [];
            }
        }
        this.updateCartCount();
    }

    // Save to localStorage
    saveCart() {
        localStorage.setItem('comicverse_cart', JSON.stringify(this.items));
        this.updateCartCount();
        this.updateCartDisplay();
    }

    // ✅ ADD ITEM (FIXED)
    async addItem(comicId, quantity = 1) {
        try {
            if (!window.database) {
                alert("Database not initialized");
                return;
            }

            const snapshot = await database.ref('comics/' + comicId).once('value');
            const comic = snapshot.val();

            if (!comic) {
                alert("Comic not found");
                return;
            }

            const existing = this.items.find(i => i.id === comicId);

            if (existing) {
                existing.quantity += quantity;
            } else {
                this.items.push({
                    id: comicId,
                    title: comic.title,
                    price: comic.price || 0,
                    imageUrl: comic.imageUrl || '',
                    author: comic.author || '',
                    quantity: quantity
                });
            }

            this.saveCart();
            this.syncWithDatabase();

            alert("Added to cart!");

        } catch (e) {
            console.error(e);
            alert("Error adding item");
        }
    }

    // Remove item
    removeItem(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.saveCart();
        this.syncWithDatabase();
    }

    // Update quantity
    updateQuantity(id, qty) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        if (qty <= 0) {
            this.removeItem(id);
        } else {
            item.quantity = qty;
            this.saveCart();
            this.syncWithDatabase();
        }
    }

    increaseQuantity(id) {
        const item = this.items.find(i => i.id === id);
        if (item) this.updateQuantity(id, item.quantity + 1);
    }

    decreaseQuantity(id) {
        const item = this.items.find(i => i.id === id);
        if (item) this.updateQuantity(id, item.quantity - 1);
    }

    // Total
    getTotal() {
        return this.items.reduce((s, i) => s + i.price * i.quantity, 0);
    }

    // Count
    getItemCount() {
        return this.items.reduce((s, i) => s + i.quantity, 0);
    }

    // Update cart badge
    updateCartCount() {
        const el = document.querySelectorAll('.cart-count');
        const count = this.getItemCount();

        el.forEach(e => {
            e.textContent = count;
            e.style.display = count > 0 ? 'inline' : 'none';
        });
    }

    // ✅ DISPLAY (FIXED)
    updateCartDisplay() {
        const container = document.getElementById('cartItems');
        const totalEl = document.getElementById('cartTotal');

        if (!container) return;

        if (this.items.length === 0) {
            container.innerHTML = "<p>Your cart is empty</p>";
            if (totalEl) totalEl.textContent = "$0.00";
            return;
        }

        let html = '';

        this.items.forEach(item => {
            html += `
                <div class="cart-item">
                    <h3>${item.title}</h3>
                    <p>$${item.price}</p>
                    
                    <button onclick="cart.decreaseQuantity('${item.id}')">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="cart.increaseQuantity('${item.id}')">+</button>

                    <button onclick="cart.removeItem('${item.id}')">Remove</button>
                </div>
            `;
        });

        container.innerHTML = html;

        if (totalEl) {
            totalEl.textContent = "$" + this.getTotal().toFixed(2);
        }
    }

    // ✅ SYNC TO FIREBASE
    async syncWithDatabase() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await database.ref('carts/' + user.uid).set({
                items: this.items,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error(e);
        }
    }

    // Load from Firebase
    async loadFromDatabase() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const snap = await database.ref('carts/' + user.uid).once('value');
            const data = snap.val();

            if (data && data.items) {
                this.items = data.items;
                this.saveCart();
            }
        } catch (e) {
            console.error(e);
        }
    }

    // Checkout (demo)
    async checkout() {
        const user = auth.currentUser;

        if (!user) {
            window.location.href = "/pages/login.html";
            return;
        }

        if (this.items.length === 0) {
            alert("Cart empty");
            return;
        }

        try {
            await database.ref('orders').push({
                userId: user.uid,
                items: this.items,
                total: this.getTotal(),
                createdAt: new Date().toISOString()
            });

            this.items = [];
            this.saveCart();

            alert("Order placed!");
            window.location.href = "/pages/dashboard.html";

        } catch (e) {
            console.error(e);
            alert("Checkout failed");
        }
    }
}

// ✅ INIT
const cart = new Cart();
window.cart = cart;

// Load cart after login
auth.onAuthStateChanged(user => {
    if (user) {
        cart.loadFromDatabase();
    }
});