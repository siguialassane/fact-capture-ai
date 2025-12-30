/**
 * Base API Client
 * 
 * Classe de base pour tous les clients API. Fournit la méthode request() commune.
 */

import { config } from "../../config";
import type { ApiResponse } from "../types";

const BACKEND_URL = config.backendUrl;

export class BaseApiClient {
    protected baseUrl: string;

    constructor(baseUrl: string = BACKEND_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Make a request to the backend
     */
    protected async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;

        const defaultHeaders: HeadersInit = {
            "Content-Type": "application/json",
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...options.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || {
                        code: "REQUEST_FAILED",
                        message: `Request failed with status ${response.status}`,
                    },
                };
            }

            return data;
        } catch (error) {
            console.error(`[API] Request to ${endpoint} failed:`, error);
            return {
                success: false,
                error: {
                    code: "NETWORK_ERROR",
                    message: error instanceof Error ? error.message : "Network request failed",
                },
            };
        }
    }
}

export { BACKEND_URL };
