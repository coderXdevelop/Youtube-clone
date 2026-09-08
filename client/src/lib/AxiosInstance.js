import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    }
});

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