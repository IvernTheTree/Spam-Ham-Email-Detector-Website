import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000",
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err?.response?.data?.detail || err.message || "Something went wrong";
    alert(message);
    return Promise.reject(err);
  }
);

export default api;