"use client";

import React, { createContext, useContext, useState } from "react";

type EnvironmentContextType = {
    theme: string;
    setTheme: (theme: string) => void;
};

const EnvironmentContext = createContext<EnvironmentContextType>({
    theme: "light",
    setTheme: () => {},
});

export const EnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<string>("light");

    return (
        <EnvironmentContext.Provider value={{ theme, setTheme }}>
            {children}
        </EnvironmentContext.Provider>
    );
};

export const useEnvironment = () => useContext(EnvironmentContext);
