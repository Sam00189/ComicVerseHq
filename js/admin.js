// ==============================
// ADMIN MODULE (FULL FIXED)
// ==============================

// ==============================
// AUTH CHECK
// ==============================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/pages/admin/login.html";
        return;
    }

    const admin = await isAdmin(user.uid);

    if (!admin) {
        alert("Access denied ❌");
        window.location.href = "/";
        return;
    }

    initAdmin();
});

// ==============================
// INIT
// ==============================
function initAdmin() {
    const path = window.location.pathname;

    if (path.includes("dashboard.html")) {
        loadDashboard();
    }

    if (path.includes("manage-comics.html")) {
        loadComics();
    }

    if (path.includes("manage-users.html")) {
        loadUsers();
    }
}

// ==============================
// NOTIFICATION
// ==============================
function showNotification(msg) {
    alert(msg);
}

// ==============================
// DASHBOARD
// ==============================
async function loadDashboard() {
    const comics = (await database.ref("comics").once("value")).val();
    const users = (await database.ref("users").once("value")).val();
    const orders = (await database.ref("orders").once("value")).val();

    document.getElementById("totalComics").textContent = comics ? Object.keys(comics).length : 0;
    document.getElementById("totalUsers").textContent = users ? Object.keys(users).length : 0;
    document.getElementById("totalOrders").textContent = orders ? Object.keys(orders).length : 0;
}

// ==============================
// LOAD COMICS
// ==============================
async function loadComics() {
    const snapshot = await database.ref("comics").once("value");
    const comics = snapshot.val();

    const tbody = document.getElementById("comicsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!comics) {
        tbody.innerHTML = "<tr><td>No comics found</td></tr>";
        return;
    }

    Object.keys(comics).forEach(id => {
        const c = comics[id];

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${c.title}</td>
            <td>$${c.price}</td>
            <td>
                <button onclick="editComic('${id}')">Edit</button>
                <button onclick="deleteComic('${id}')">Delete</button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// ==============================
// ADD COMIC
// ==============================
async function addComic(data) {
    if (!data.title || !data.price) {
        alert("Title and price required");
        return;
    }

    const ref = database.ref("comics").push();

    await ref.set({
        id: ref.key,
        title: data.title,
        price: data.price,
        createdAt: new Date().toISOString()
    });

    showNotification("Comic added ✅");
    loadComics();
}

// ==============================
// EDIT COMIC
// ==============================
async function editComic(id) {
    const snap = await database.ref("comics/" + id).once("value");
    const c = snap.val();

    if (!c) return;

    document.getElementById("comicId").value = id;
    document.getElementById("title").value = c.title;
    document.getElementById("price").value = c.price;
}

// ==============================
// UPDATE COMIC
// ==============================
async function updateComic(id, data) {
    await database.ref("comics/" + id).update({
        title: data.title,
        price: data.price,
        updatedAt: new Date().toISOString()
    });

    showNotification("Updated ✅");
    loadComics();
}

// ==============================
// DELETE COMIC
// ==============================
async function deleteComic(id) {
    if (!confirm("Delete this comic?")) return;

    await database.ref("comics/" + id).remove();

    showNotification("Deleted ❌");
    loadComics();
}

// ==============================
// LOAD USERS
// ==============================
async function loadUsers() {
    const snapshot = await database.ref("users").once("value");
    const users = snapshot.val();

    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!users) return;

    Object.keys(users).forEach(uid => {
        const u = users[uid];

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${u.email}</td>
            <td>${u.role || "user"}</td>
            <td>
                <button onclick="toggleAdmin('${uid}')">Toggle Admin</button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// ==============================
// TOGGLE ADMIN (THIS FIXES YOUR ERROR)
// ==============================
async function toggleAdmin(uid) {
    const snap = await database.ref("users/" + uid).once("value");
    const user = snap.val();

    if (!user) return;

    const newRole = user.role === "admin" ? "user" : "admin";

    await database.ref("users/" + uid).update({
        role: newRole
    });

    alert("Role updated 🔄");
    loadUsers();
}

// ==============================
// FORM HANDLER
// ==============================
const form = document.getElementById("comicForm");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("comicId").value;

        const data = {
            title: document.getElementById("title").value,
            price: parseFloat(document.getElementById("price").value)
        };

        if (id) {
            await updateComic(id, data);
        } else {
            await addComic(data);
        }

        form.reset();
        document.getElementById("comicId").value = "";
    });
}

// ==============================
// EXPORT (NO ERROR NOW)
// ==============================
window.addComic = addComic;
window.editComic = editComic;
window.deleteComic = deleteComic;
window.toggleAdmin = toggleAdmin;