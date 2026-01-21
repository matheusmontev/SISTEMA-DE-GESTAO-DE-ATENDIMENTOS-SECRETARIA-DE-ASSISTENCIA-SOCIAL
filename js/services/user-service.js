import { db, auth } from '../firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const USERS_COLLECTION = 'users';

export const UserService = {
    // Get user profile object by Auth UID
    async getUserProfile(uid) {
        try {
            const userRef = doc(db, USERS_COLLECTION, uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                return { uid, ...userSnap.data() };
            }
            return null;
        } catch (error) {
            console.error("Error getting user profile:", error);
            throw error;
        }
    },

    // Create a new user (Firestore only - called after Auth creation)
    async createUserProfile(uid, userData) {
        try {
            await setDoc(doc(db, USERS_COLLECTION, uid), {
                ...userData,
                createdAt: new Date(),
                active: true
            });
            return true;
        } catch (error) {
            console.error("Error creating user profile:", error);
            throw error;
        }
    },

    // Check if any user exists (to allow first admin setup)
    async hasUsers() {
        try {
            const q = query(collection(db, USERS_COLLECTION), where("active", "==", true)); // Simple check
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            return false;
        }
    }
};
