import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    }
});

export default axiosInstance;