import axios from "axios";

// will be replaced by api gateway single point of communication

export const NODE_BACKEND_URL =
  import.meta.env.VITE_NODE_BACKEND_URL || "http://localhost:4000";

export const GEMINI_BACKEND_URL =
  import.meta.env.VITE_GEMINI_BACKEND_URL || "http://localhost:8000";

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const createApiClient = (baseURL) => {
  const client = axios.create({ baseURL });

  client.interceptors.request.use(
    (config) => {
      config.headers = { ...config.headers, ...authHeader() };
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const message =
        error.response?.data?.message ||
        error.response?.statusText ||
        error.message ||
        "Unknown API error";
      return Promise.reject(new Error(message));
    }
  );

  return client;
};


export const nodeClient = createApiClient(NODE_BACKEND_URL);
export const geminiClient = createApiClient(GEMINI_BACKEND_URL);
