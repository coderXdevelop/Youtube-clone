"use client";

import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, useContext, createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./AxiosInstance";
import { useEnvironment } from "./EnvironmentContext";
import LoginSecurityOtpModal, { OtpChallengeData } from "@/components/LoginSecurityOtpModal";

const UserContext = createContext();

/**
 * Helper to get or generate persistent device ID in client localStorage
 */
const getOrCreateDeviceId = () => {
    if (typeof window === "undefined") return "dev_server";
    let devId = localStorage.getItem("yt_device_id");
    if (!devId) {
        devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem("yt_device_id", devId);
    }
    return devId;
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { applyLoginTheme } = useEnvironment();

    // 2FA OTP Challenge states
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [challengeData, setChallengeData] = useState(null);
    const [pendingFirebaseUser, setPendingFirebaseUser] = useState(null);

    const login = (userdata, appliedTheme) => {
        setUser(userdata);
        if (typeof window !== "undefined") {
            localStorage.setItem("user", JSON.stringify(userdata));
        }
        if (appliedTheme) {
            applyLoginTheme(appliedTheme, userdata?.themepreference || "auto");
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

    /**
     * Send login payload with rich device & location metadata to backend
     */
    const authenticateWithBackend = async (firebaseuser) => {
        try {
            const deviceId = getOrCreateDeviceId();
            const payload = {
                email: firebaseuser.email || "",
                name: firebaseuser.displayName || (firebaseuser.email ? firebaseuser.email.split("@")[0] : "User"),
                image: firebaseuser.photoURL || "https://github.com/shadcn.png",
                deviceId,
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
                clientLocation: {
                    city: "Bengaluru",
                    state: "Karnataka",
                    country: "India",
                    loc: "12.9716,77.5946",
                },
            };

            const response = await axiosInstance.post("/api/user/login", payload);

            // If new browser/device/IP/location detected -> Challenge with OTP
            if (response.data?.requiresOtp && response.data?.challengeId) {
                setChallengeData({
                    challengeId: response.data.challengeId,
                    emailMasked: response.data.emailMasked,
                    reason: response.data.reason,
                    testOtp: response.data.testOtp,
                    deviceInfo: response.data.deviceInfo,
                });
                setPendingFirebaseUser(firebaseuser);
                setIsOtpModalOpen(true);
                return;
            }

            // Normal login success
            if (response.data?.result) {
                login(response.data.result, response.data.appliedTheme);
            }
        } catch (error) {
            console.error("Backend auth sync error:", error);
            setUser(null);
            if (typeof window !== "undefined") {
                localStorage.removeItem("user");
            }
        }
    };

    const handlegooglesignin = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const firebaseuser = result.user;
            await authenticateWithBackend(firebaseuser);
        } catch (error) {
            if (
                error.code === "auth/popup-closed-by-user" ||
                error.code === "auth/cancelled-popup-request"
            ) {
                console.log("Firebase sign-in popup was closed or cancelled.");
                return;
            }
            console.error("Google sign in error:", error);
            alert(`Google Sign-In error: ${error.message || error}`);
        }
    };

    const handleOtpSuccess = (userDoc, appliedTheme) => {
        login(userDoc, appliedTheme);
        setChallengeData(null);
        setPendingFirebaseUser(null);
        setIsOtpModalOpen(false);
    };

    useEffect(() => {
        const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
            if (firebaseuser) {
                await authenticateWithBackend(firebaseuser);
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
        <UserContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                handlegooglesignin,
                authenticateWithBackend,
            }}
        >
            {children}

            {/* 2FA Security OTP Verification Challenge Modal */}
            <LoginSecurityOtpModal
                isOpen={isOtpModalOpen}
                onClose={() => {
                    setIsOtpModalOpen(false);
                    setChallengeData(null);
                }}
                challengeData={challengeData}
                onSuccess={handleOtpSuccess}
            />
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        return {
            user: null,
            loading: false,
            login: () => {},
            logout: () => {},
            handlegooglesignin: () => {},
            authenticateWithBackend: () => {},
        };
    }
    return context;
};