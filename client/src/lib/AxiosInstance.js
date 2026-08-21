import dotenv from "dotenv";
dotenv.config();
import axios from "axios";

const API_URL = process.env.BACKEND_URL;
const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    }
})
export default axiosInstance