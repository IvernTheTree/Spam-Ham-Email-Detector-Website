import axios from "axios";
export const api = axios.create({ baseURL: "http://localhost:8000", timeout: 10000 });
export const toError = (e) => e?.response?.data?.detail || e.message || "Unexpected error";
