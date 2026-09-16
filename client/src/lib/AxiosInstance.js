import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    }
});

// Request interceptor: automatically attach Authorization Bearer token from localStorage
axiosInstance.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("yt_auth_token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            const userStr = localStorage.getItem("user");
            if (userStr) {
                try {
                    const parsed = JSON.parse(userStr);
                    if (parsed?._id) {
                        config.headers["x-user-id"] = parsed._id;
                    }
                } catch {}
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === "ERR_NETWORK" || !error.response) {
            console.warn(`[Axios Network Warning] Backend API (${API_URL}) connection interrupted or restarting:`, error.message);
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;