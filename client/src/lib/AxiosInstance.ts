import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor: automatically attach Authorization Bearer token and user ID from localStorage
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("yt_auth_token");
            if (token) {
                config.headers.set("Authorization", `Bearer ${token}`);
            }
            const userStr = localStorage.getItem("user");
            if (userStr) {
                try {
                    const parsed = JSON.parse(userStr);
                    if (parsed?._id) {
                        config.headers.set("x-user-id", parsed._id);
                    }
                } catch {
                    // Ignore parse errors
                }
            }
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.code === "ERR_NETWORK" || !error.response) {
            console.warn(`[Axios Network Warning] Backend API (${API_URL}) connection interrupted:`, error.message);
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
