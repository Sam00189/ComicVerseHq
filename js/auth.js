// Authentication Module with Realtime Database

// Sign Up Function
async function signUp(email, password, userData) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await user.sendEmailVerification();

        // Store user data in Realtime Database
        await database.ref('users/' + user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: userData.displayName || '',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            phone: userData.phone || '',
            address: userData.address || '',
            city: userData.city || '',
            state: userData.state || '',
            zipCode: userData.zipCode || '',
            country: userData.country || 'US',
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            isAdmin: false,
            emailVerified: user.emailVerified,
            preferences: {
                newsletter: true,
                notifications: true
            }
        });

        // Create user cart in Realtime Database
        await database.ref('carts/' + user.uid).set({
            userId: user.uid,
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        return { success: true, user };
    } catch (error) {
        console.error('Sign up error:', error);
        return { 
            success: false, 
            error: error.message,
            code: error.code 
        };
    }
}

// Login Function
async function login(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update last seen
        await database.ref('users/' + user.uid).update({
            lastSeen: new Date().toISOString(),
            online: true
        });

        return { success: true, user };
    } catch (error) {
        console.error('Login error:', error);
        return { 
            success: false, 
            error: error.message,
            code: error.code 
        };
    }
}

// Logout Function
async function logout() {
    try {
        const user = auth.currentUser;
        if (user) {
            await database.ref('users/' + user.uid).update({
                lastSeen: new Date().toISOString(),
                online: false
            });
        }
        
        await auth.signOut();
        localStorage.removeItem('cart');
        localStorage.removeItem('userData');
        window.location.href = '/';
        
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

// Password Reset Function
async function resetPassword(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        return { success: true };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
    }
}

// Update Password Function
async function updatePassword(currentPassword, newPassword) {
    try {
        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email, 
            currentPassword
        );
        
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        
        return { success: true };
    } catch (error) {
        console.error('Password update error:', error);
        return { success: false, error: error.message };
    }
}

// Update Profile Function
async function updateProfile(userData) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user logged in');

        if (userData.displayName) {
            await user.updateProfile({
                displayName: userData.displayName
            });
        }

        // Update user data in Realtime Database
        await database.ref('users/' + user.uid).update({
            ...userData,
            updatedAt: new Date().toISOString()
        });

        return { success: true };
    } catch (error) {
        console.error('Profile update error:', error);
        return { success: false, error: error.message };
    }
}

// Get User Data Function
async function getUserData(userId) {
    try {
        const snapshot = await database.ref('users/' + userId).once('value');
        const userData = snapshot.val();
        
        if (userData) {
            return { success: true, data: userData };
        } else {
            return { success: false, error: 'User not found' };
        }
    } catch (error) {
        console.error('Get user data error:', error);
        return { success: false, error: error.message };
    }
}

// Check Admin Status
async function isAdmin(userId) {
    try {
        const snapshot = await database.ref('users/' + userId + '/isAdmin').once('value');
        return snapshot.val() === true;
    } catch (error) {
        console.error('Check admin error:', error);
        return false;
    }
}

// Resend Verification Email
async function resendVerificationEmail() {
    try {
        const user = auth.currentUser;
        if (user) {
            await user.sendEmailVerification();
            return { success: true };
        }
        return { success: false, error: 'No user logged in' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Google Login
async function googleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const userCredential = await auth.signInWithPopup(provider);
        const user = userCredential.user;

        // Check if user exists in Realtime Database
        const snapshot = await database.ref('users/' + user.uid).once('value');
        
        if (!snapshot.exists()) {
            // Create new user document
            await database.ref('users/' + user.uid).set({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                isAdmin: false,
                emailVerified: user.emailVerified
            });
        }

        return { success: true, user };
    } catch (error) {
        console.error('Google login error:', error);
        return { success: false, error: error.message };
    }
}

// Auth state observer
auth.onAuthStateChanged(async (user) => {
    const authLinks = document.getElementById('authLinks');
    
    if (authLinks) {
        if (user) {
            authLinks.innerHTML = `
                <a href="/pages/dashboard.html" class="btn-dashboard">Dashboard</a>
                <button onclick="logout()" class="btn-logout">Logout</button>
            `;
            
            const admin = await isAdmin(user.uid);
            if (admin && !document.querySelector('.admin-link')) {
                const adminLink = document.createElement('li');
                adminLink.innerHTML = '<a href="/pages/admin/dashboard.html" class="admin-link">Admin</a>';
                const navMenu = document.querySelector('.nav-menu');
                if (navMenu) navMenu.appendChild(adminLink);
            }
        } else {
            authLinks.innerHTML = `
                <a href="/pages/login.html" class="btn-login">Login</a>
                <a href="/pages/signup.html" class="btn-signup">Sign Up</a>
            `;
        }
    }
});

// Make functions global
window.signUp = signUp;
window.login = login;
window.logout = logout;
window.resetPassword = resetPassword;
window.updatePassword = updatePassword;
window.updateProfile = updateProfile;
window.getUserData = getUserData;
window.isAdmin = isAdmin;
window.resendVerificationEmail = resendVerificationEmail;
window.googleLogin = googleLogin;