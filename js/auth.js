// ==============================
// AUTH MODULE (SIMPLIFIED)
// ==============================

// SIGN UP
async function signUp(email, password, username) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Save to Realtime DB
        await database.ref("users/" + user.uid).set({
            uid: user.uid,
            email: email,
            username: username,
            role: "user",
            createdAt: new Date().toISOString()
        });

        return { success: true, user };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// LOGIN
async function login(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// LOGOUT
async function logout() {
    await auth.signOut();
    window.location.href = "/";
}

// CHECK ADMIN
async function isAdmin(uid) {
    const snapshot = await database.ref("users/" + uid + "/role").once("value");
    return snapshot.val() === "admin";
}

// GOOGLE LOGIN
async function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);

    const user = result.user;

    const snap = await database.ref("users/" + user.uid).once("value");

    if (!snap.exists()) {
        await database.ref("users/" + user.uid).set({
            uid: user.uid,
            email: user.email,
            username: user.displayName,
            role: "user",
            createdAt: new Date().toISOString()
        });
    }

    return { success: true, user };
}

// ==============================
// AUTH STATE
// ==============================
auth.onAuthStateChanged(async (user) => {
    const authLinks = document.getElementById("authLinks");

    if (!authLinks) return;

    if (user) {
        authLinks.innerHTML = `
            <a href="/pages/dashboard.html">Dashboard</a>
            <button onclick="logout()">Logout</button>
        `;

        const admin = await isAdmin(user.uid);

        if (admin && !document.querySelector(".admin-link")) {
            const li = document.createElement("li");
            li.innerHTML = `<a href="/pages/admin/dashboard.html" class="admin-link">Admin</a>`;
            document.querySelector(".nav-menu")?.appendChild(li);
        }

    } else {
        authLinks.innerHTML = `
            <a href="/pages/login.html">Login</a>
            <a href="/pages/signup.html">Sign Up</a>
        `;
    }
});

// ==============================
// EXPORTS
// ==============================
window.signUp = signUp;
window.login = login;
window.logout = logout;
window.isAdmin = isAdmin;
window.googleLogin = googleLogin;