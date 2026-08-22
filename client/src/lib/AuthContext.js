"use client";

import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./AxiosInstance";
import { useEffect, useContext } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = (userdata) => {
        setUser(userdata);
        if (typeof window !== "undefined") {
            localStorage.setItem("user", JSON.stringify(userdata));
        }
    };

    const logout = async () => {
        setUser(null);
        if (typeof window !== "undefined") {
            localStorage.removeItem("user");
        }
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error during sign out:", error);
        }
    };

    const handlegooglesignin = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const firebaseuser = result.user;
            const payload = {
                email: firebaseuser.email || "",
                name: firebaseuser.displayName || (firebaseuser.email ? firebaseuser.email.split("@")[0] : "User"),
                image: firebaseuser.photoURL || "https://github.com/shadcn.png",
            };
            const response = await axiosInstance.post("/api/user/login", payload);
            if (response.data && response.data.result) {
                login(response.data.result);
            }
        } catch (error) {
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                console.log("Firebase sign-in popup was closed or cancelled.");
                return;
            }
            console.error("Google sign in error:", error);
            alert(`Google Sign-In error: ${error.message || error}`);
        }
    };

    useEffect(() => {
        const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
            if (firebaseuser) {
                try {
                    const payload = {
                        email: firebaseuser.email || "",
                        name: firebaseuser.displayName || (firebaseuser.email ? firebaseuser.email.split("@")[0] : "User"),
                        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
                    };
                    const response = await axiosInstance.post("/api/user/login", payload);
                    if (response.data && response.data.result) {
                        login(response.data.result);
                    }
                } catch (error) {
                    console.error("Backend auth sync error:", error);
                    setUser(null);
                    if (typeof window !== "undefined") {
                        localStorage.removeItem("user");
                    }
                }
            } else {
                setUser(null);
                if (typeof window !== "undefined") {
                    localStorage.removeItem("user");
                }
            }
            setLoading(false);
        });
        return () => unsubcribe();
    }, []);

    return (
        <UserContext.Provider value={{ user, loading, login, logout, handlegooglesignin }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        return { user: null, loading: false, login: () => {}, logout: () => {}, handlegooglesignin: () => {} };
    }
    return context;
};