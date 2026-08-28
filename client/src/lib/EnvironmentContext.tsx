"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "./AxiosInstance";

type ThemeMode = "light" | "dark";
type ThemePreference = "auto" | "light" | "dark";

type EnvironmentContextType = {
    theme: ThemeMode;
    themePreference: ThemePreference;
    setTheme: (theme: ThemeMode) => void;
    setThemePreference: (pref: ThemePreference, userId?: string) => Promise<void>;
    applyLoginTheme: (theme: ThemeMode, preference?: ThemePreference) => void;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    closeSidebar: () => void;
};

const EnvironmentContext = createContext<EnvironmentContextType>({
    theme: "light",
    themePreference: "auto",
    setTheme: () => {},
    setThemePreference: async () => {},
    applyLoginTheme: () => {},
    isSidebarOpen: false,
    toggleSidebar: () => {},
    setSidebarOpen: () => {},
    closeSidebar: () => {},
});

/**
 * Calculate IST (UTC+5:30) time and determine light theme if 5:00 AM - 12:00 PM IST
 */
export const computeCurrentIstTheme = (): ThemeMode => {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + 330 * 60000);

    const istHours = istTime.getHours();
    const istMinutes = istTime.getMinutes();
    const totalMinutes = istHours * 60 + istMinutes;

    // 5:00 AM = 300 mins, 12:00 PM = 720 mins
    return totalMinutes >= 300 && totalMinutes <= 720 ? "light" : "dark";
};

export const EnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themePreference, setThemePreferenceState] = useState<ThemePreference>("auto");
    const [theme, setThemeState] = useState<ThemeMode>("light");
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen((prev) => !prev);
    const closeSidebar = () => setSidebarOpen(false);

    // Initialize from local storage or calculate IST time
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedPref = (localStorage.getItem("yt_theme_pref") as ThemePreference) || "auto";
            const savedTheme = localStorage.getItem("yt_theme") as ThemeMode;

            setThemePreferenceState(savedPref);

            if (savedPref === "auto") {
                const istTheme = computeCurrentIstTheme();
                setThemeState(istTheme);
                document.documentElement.classList.toggle("dark", istTheme === "dark");
            } else if (savedTheme) {
                setThemeState(savedTheme);
                document.documentElement.classList.toggle("dark", savedTheme === "dark");
            } else {
                setThemeState(savedPref);
                document.documentElement.classList.toggle("dark", savedPref === "dark");
            }
        }
    }, []);

    const setTheme = (newTheme: ThemeMode) => {
        setThemeState(newTheme);
        if (typeof window !== "undefined") {
            localStorage.setItem("yt_theme", newTheme);
            document.documentElement.classList.toggle("dark", newTheme === "dark");
        }
    };

    const setThemePreference = async (pref: ThemePreference, userId?: string) => {
        setThemePreferenceState(pref);
        if (typeof window !== "undefined") {
            localStorage.setItem("yt_theme_pref", pref);
        }

        let effectiveTheme: ThemeMode = "light";
        if (pref === "auto") {
            effectiveTheme = computeCurrentIstTheme();
        } else {
            effectiveTheme = pref;
        }

        setTheme(effectiveTheme);

        if (userId) {
            try {
                await axiosInstance.post("/api/user/theme-preference", {
                    userId,
                    themePreference: pref,
                });
            } catch (err) {
                console.error("Failed to sync theme preference with backend:", err);
            }
        }
    };

    const applyLoginTheme = (loginTheme: ThemeMode, preference: ThemePreference = "auto") => {
        setThemePreferenceState(preference);
        setTheme(loginTheme);
        if (typeof window !== "undefined") {
            localStorage.setItem("yt_theme_pref", preference);
            localStorage.setItem("yt_theme", loginTheme);
        }
    };

    return (
        <EnvironmentContext.Provider
            value={{
                theme,
                themePreference,
                setTheme,
                setThemePreference,
                applyLoginTheme,
                isSidebarOpen,
                toggleSidebar,
                setSidebarOpen,
                closeSidebar,
            }}
        >
            {children}
        </EnvironmentContext.Provider>
    );
};

export const useEnvironment = () => useContext(EnvironmentContext);
