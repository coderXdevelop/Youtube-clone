"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance from "./AxiosInstance";

export type ThemeMode = "light" | "dark";
export type ThemePreference = "auto" | "light" | "dark";

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
 * Calculate IST (UTC+5:30) time and determine light theme if 5:00 AM - 12:00 PM IST,
 * otherwise dark theme. Falls back to system preference if time calculation is unavailable.
 */
export const computeCurrentIstTheme = (): ThemeMode => {
    try {
        const now = new Date();
        const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
        const istTime = new Date(utcTime + 330 * 60000);

        const istHours = istTime.getHours();
        const istMinutes = istTime.getMinutes();
        const totalMinutes = istHours * 60 + istMinutes;

        // 5:00 AM = 300 mins, 12:00 PM = 720 mins IST
        return totalMinutes >= 300 && totalMinutes <= 720 ? "light" : "dark";
    } catch {
        if (typeof window !== "undefined" && window.matchMedia) {
            return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        return "dark";
    }
};

const applyDomTheme = (mode: ThemeMode) => {
    if (typeof document !== "undefined") {
        if (mode === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }
};

export const EnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themePreference, setThemePreferenceState] = useState<ThemePreference>("auto");
    const [theme, setThemeState] = useState<ThemeMode>("dark");
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => setSidebarOpen((prev) => !prev);
    const closeSidebar = () => setSidebarOpen(false);

    const updateThemeStateAndDom = useCallback((newMode: ThemeMode) => {
        setThemeState(newMode);
        applyDomTheme(newMode);
        if (typeof window !== "undefined") {
            localStorage.setItem("yt_theme", newMode);
        }
    }, []);

    // Re-evaluate theme based on current preference
    const evaluateAndApplyTheme = useCallback((pref: ThemePreference) => {
        let targetTheme: ThemeMode;
        if (pref === "auto") {
            targetTheme = computeCurrentIstTheme();
        } else {
            targetTheme = pref;
        }
        updateThemeStateAndDom(targetTheme);
    }, [updateThemeStateAndDom]);

    // Initialize from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedPref = (localStorage.getItem("yt_theme_pref") as ThemePreference) || "auto";
            setThemePreferenceState(savedPref);
            evaluateAndApplyTheme(savedPref);
        }
    }, [evaluateAndApplyTheme]);

    // Periodically re-evaluate "auto" theme (every 60s) or on system theme change
    useEffect(() => {
        if (themePreference !== "auto") return;

        const interval = setInterval(() => {
            evaluateAndApplyTheme("auto");
        }, 60000);

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleSystemThemeChange = () => {
            evaluateAndApplyTheme("auto");
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener("change", handleSystemThemeChange);
        }

        return () => {
            clearInterval(interval);
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener("change", handleSystemThemeChange);
            }
        };
    }, [themePreference, evaluateAndApplyTheme]);

    // Explicit manual theme override (e.g., from quick header toggle)
    const setTheme = (newTheme: ThemeMode) => {
        setThemePreferenceState(newTheme);
        if (typeof window !== "undefined") {
            localStorage.setItem("yt_theme_pref", newTheme);
        }
        updateThemeStateAndDom(newTheme);
    };

    // Full theme preference setter (supports "auto", "light", "dark") with optional backend sync
    const setThemePreference = async (pref: ThemePreference, userId?: string) => {
        setThemePreferenceState(pref);
        if (typeof window !== "undefined") {
            localStorage.setItem("yt_theme_pref", pref);
        }

        evaluateAndApplyTheme(pref);

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

    // Called when user logs in with backend theme info
    const applyLoginTheme = (loginTheme: ThemeMode, preference: ThemePreference = "auto") => {
        setThemePreferenceState(preference);
        if (typeof window !== "undefined") {
            localStorage.setItem("yt_theme_pref", preference);
        }
        const effectiveTheme = preference === "auto" ? computeCurrentIstTheme() : loginTheme;
        updateThemeStateAndDom(effectiveTheme);
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
