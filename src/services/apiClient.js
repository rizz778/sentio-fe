import axios from "axios";
import { GATEWAY_URL } from "../config/api";

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Creates an axios client configured to route through the Sentio API Gateway.
 *
 * @param {string|null} serviceName - Downstream service target ('node-backend' | 'fastapi-backend' | null)
 */
const createGatewayClient = (serviceName) => {
  const client = axios.create({ baseURL: GATEWAY_URL });

  client.interceptors.request.use(
    (config) => {
      config.headers = {
        ...config.headers,
        ...authHeader(),
        ...(serviceName ? { "x-sentio-service": serviceName } : {}),
      };
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.statusText ||
        error.message ||
        "Unknown API error";
      return Promise.reject(new Error(message));
    }
  );

  return client;
};

// Proxied clients through API Gateway
export const nodeClient = createGatewayClient("node-backend");
export const geminiClient = createGatewayClient("fastapi-backend");
export const gatewayClient = createGatewayClient(null); // Direct gateway endpoints (/auth/google, etc.)
