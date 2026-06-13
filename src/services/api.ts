// src/services/api.ts
// Configuración central de Axios para comunicarse con el backend SARA

import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000", // Puerto de tu FastAPI configurable en producción
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor: agrega automáticamente el token JWT a cada petición
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("sara_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
