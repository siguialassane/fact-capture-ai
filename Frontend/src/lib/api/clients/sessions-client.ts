/**
 * Sessions API Client
 * 
 * Méthodes pour la synchronisation PWA
 */

import { BaseApiClient } from "./base-client";

export class SessionsClient extends BaseApiClient {

    async createSession(desktopId?: string, expiresInMinutes: number = 15): Promise<{
        id: string;
        desktop_id: string;
        status: string;
        expires_at: string;
    } | null> {
        const response = await this.request<{
            id: string;
            desktop_id: string;
            status: string;
            expires_at: string;
        }>("/api/sessions", {
            method: "POST",
            body: JSON.stringify({ desktopId, expiresInMinutes }),
        });

        return response.data || null;
    }

    async getSession(id: string): Promise<{
        id: string;
        desktop_id: string;
        status: string;
        image_base64?: string;
        expires_at: string;
    } | null> {
        const response = await this.request<{
            id: string;
            desktop_id: string;
            status: string;
            image_base64?: string;
            expires_at: string;
        }>(`/api/sessions/${id}`);

        return response.data || null;
    }

    async updateSession(
        id: string,
        updates: { status?: string; imageBase64?: string }
    ): Promise<boolean> {
        const response = await this.request(`/api/sessions/${id}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
        });

        return response.success;
    }
}
