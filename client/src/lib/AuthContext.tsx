"use client";

import React, {
    useState,
    useEffect,
    useContext,
    createContext,
    useRef,
    ReactNode,
} from "react";
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    signOut,
    User as FirebaseUser,
} from "firebase/auth";
import { provider, auth } from "./firebase";
import axiosInstance from "./AxiosInstance";
import { useEnvironment } from "./EnvironmentContext";
import LoginSecurityOtpModal, {
    OtpChallengeData,
} from "@/components/LoginSecurityOtpModal";

export interface UserData {
    _id?: string;
    email?: string;
    name?: string;
    image?: string;
    channelname?: string;
    channelName?: string;
    description?: string;
    discription?: string;
    userHandle?: string;
    subscribers?: number;
    subscribersCount?: number;
    subscribedChannels?: string[];
    premiumExpiresAt?: string | null;
    isPremium?: boolean;
    themepreference?: string;
    joinedon?: string | Date;
    [key: string]: unknown;
}

export interface UserContextType {
    user: UserData | null;
    loading: boolean;
    login: (userdata: UserData, appliedTheme?: string, token?: string) => void;
    logout: () => Promise<void>;
    handlegooglesignin: () => Promise<void>;
    authenticateWithBackend: (firebaseuser: FirebaseUser) => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

/**
 * Helper to get or generate persistent device ID in client localStorage
 */
const getOrCreateDeviceId = (): string => {
    if (typeof window === "undefined") return "dev_server";
    let devId = localStorage.getItem("yt_device_id");
    if (!devId) {
        devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem("yt_device_id", devId);
    }
    return devId;
};

/**
 * Dynamically resolves client geographical location using free IP lookup or browser timeZone
 */
const fetchClientLocation = async () => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
            const data = await res.json();
            if (data.city && data.country_name) {
                return {
                    city: data.city,
                    state: data.region || data.city,
                    country: data.country_name,
                    loc: `${data.latitude || ""},${data.longitude || ""}`,
                };
            }
        }
    } catch {
        // Fallback below
    }

    // Fallback: estimate location from browser timezone
    try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timeZone) {
            const parts = timeZone.split("/");
            const city = parts[parts.length - 1].replace(/_/g, " ");
            const isIndic =
                timeZone.includes("Calcutta") ||
                timeZone.includes("Kolkata") ||
                timeZone.includes("India");
            return {
                city: city || "Bengaluru",
                state: isIndic ? "Karnataka" : (parts[0] || "State"),
                country: isIndic ? "India" : (parts[0] || "Global"),
                loc: "12.9716,77.5946",
            };
        }
    } catch {
        // Fallback below
    }

    return {
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        loc: "12.9716,77.5946",
    };
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const { applyLoginTheme } = useEnvironment();

    // 2FA OTP Challenge states
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [challengeData, setChallengeData] = useState<OtpChallengeData | null>(null);
    const [, setPendingFirebaseUser] = useState<FirebaseUser | null>(null);

    // Ref to prevent duplicate/concurrent in-flight authentication requests
    const inFlightAuthRef = useRef(false);

    const login = (userdata: UserData, appliedTheme?: string, token?: string) => {
        setUser(userdata);
        if (typeof window !== "undefined") {
            localStorage.setItem("user", JSON.stringify(userdata));
            if (token) {
                localStorage.setItem("yt_auth_token", token);
            }
        }
        if (appliedTheme) {
            applyLoginTheme(
                (appliedTheme === "light" || appliedTheme === "dark" ? appliedTheme : "dark"),
                (userdata?.themepreference as "auto" | "light" | "dark") || "auto"
            );
        }
    };

    const logout = async () => {
        setUser(null);
        setChallengeData(null);
        setIsOtpModalOpen(false);
        setPendingFirebaseUser(null);
        if (typeof window !== "undefined") {
            localStorage.removeItem("user");
            localStorage.removeItem("yt_auth_token");
        }
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error during sign out:", error);
        }
    };

    /**
     * Send login payload with rich device & dynamic location metadata to backend
     */
    const authenticateWithBackend = async (firebaseuser: FirebaseUser) => {
        if (!firebaseuser?.email) return;

        // Prevent duplicate concurrent requests
        if (inFlightAuthRef.current) {
            return;
        }

        // If OTP challenge modal is already open for this user, avoid re-triggering
        if (isOtpModalOpen && challengeData) {
            return;
        }

        // If user already logged in with matching email, skip
        if (user && user.email === firebaseuser.email) {
            return;
        }

        inFlightAuthRef.current = true;

        try {
            const deviceId = getOrCreateDeviceId();
            const locationMeta = await fetchClientLocation();
            let idToken = "";
            try {
                idToken = await firebaseuser.getIdToken();
            } catch (tokenErr) {
                console.warn("Could not retrieve Firebase ID token:", tokenErr);
            }

            const payload = {
                idToken,
                email: firebaseuser.email || "",
                name:
                    firebaseuser.displayName ||
                    (firebaseuser.email ? firebaseuser.email.split("@")[0] : "User"),
                image: firebaseuser.photoURL || "https://github.com/shadcn.png",
                deviceId,
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
                clientLocation: locationMeta,
            };

            const response = await axiosInstance.post("/api/user/login", payload);

            // If new browser/device/IP/location detected -> Challenge with OTP
            if (response.data?.requiresOtp && response.data?.challengeId) {
                setChallengeData({
                    challengeId: response.data.challengeId,
                    emailMasked: response.data.emailMasked,
                    reason: response.data.reason,
                    deviceInfo: response.data.deviceInfo,
                });
                setPendingFirebaseUser(firebaseuser);
                setIsOtpModalOpen(true);
                return;
            }

            // Normal login success
            if (response.data?.result) {
                login(response.data.result, response.data.appliedTheme, response.data.token);
            }
        } catch (error) {
            console.error("Backend auth sync error:", error);
            setUser(null);
            if (typeof window !== "undefined") {
                localStorage.removeItem("user");
                localStorage.removeItem("yt_auth_token");
            }
        } finally {
            inFlightAuthRef.current = false;
        }
    };

    const handlegooglesignin = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const firebaseuser = result.user;
            if (firebaseuser) {
                await authenticateWithBackend(firebaseuser);
            }
        } catch (error: unknown) {
            const authError = error as { code?: string; message?: string };
            if (
                authError.code === "auth/popup-closed-by-user" ||
                authError.code === "auth/cancelled-popup-request"
            ) {
                console.log("Firebase sign-in popup was closed or cancelled.");
                return;
            }
            if (authError.code === "auth/popup-blocked") {
                console.warn("Popup blocked by browser. Falling back to redirect sign-in...");
                try {
                    await signInWithRedirect(auth, provider);
                    return;
                } catch (redirectErr) {
                    console.error("Firebase redirect sign-in error:", redirectErr);
                }
            }
            console.error("Google sign in error:", error);
            alert(`Google Sign-In: ${authError.message || error}. Please allow popups or try again.`);
        }
    };

    const handleOtpSuccess = (userDoc: UserData, appliedTheme?: string, token?: string) => {
        login(userDoc, appliedTheme, token);
        setChallengeData(null);
        setPendingFirebaseUser(null);
        setIsOtpModalOpen(false);
    };

    const handleOtpClose = async () => {
        setIsOtpModalOpen(false);
        setChallengeData(null);
        setPendingFirebaseUser(null);
        setUser(null);
        if (typeof window !== "undefined") {
            localStorage.removeItem("user");
            localStorage.removeItem("yt_auth_token");
        }
        try {
            await signOut(auth);
        } catch (err) {
            console.error("Error signing out after OTP dismissal:", err);
        }
    };

    useEffect(() => {
        const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
            if (firebaseuser) {
                await authenticateWithBackend(firebaseuser);
            } else {
                setUser(null);
                if (typeof window !== "undefined") {
                    localStorage.removeItem("user");
                    localStorage.removeItem("yt_auth_token");
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
                onClose={handleOtpClose}
                challengeData={challengeData}
                onSuccess={handleOtpSuccess}
            />
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        return {
            user: null,
            loading: false,
            login: () => {},
            logout: async () => {},
            handlegooglesignin: async () => {},
            authenticateWithBackend: async () => {},
        };
    }
    return context;
};
