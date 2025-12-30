/**
 * Health API Client
 * 
 * Méthodes pour vérifier l'état du backend
 */

import { BaseApiClient } from "./base-client";

export class HealthClient extends BaseApiClient {

    async healthCheck(): Promise<boolean> {
        const response = await this.request<{ status: string }>("/api/health");
        return response.success && response.data?.status === "healthy";
    }

    async readyCheck(): Promise<{
        ready: boolean;
        checks: {
            openrouter: { configured: boolean };
            supabase: { configured: boolean };
        };
    }> {
        const response = await this.request<{
            status: string;
            checks: {
                openrouter: { configured: boolean };
                supabase: { configured: boolean };
            };
        }>("/api/health/ready");

        return {
            ready: response.success && response.data?.status === "ready",
            checks: response.data?.checks || {
                openrouter: { configured: false },
                supabase: { configured: false },
            },
        };
    }
}
