import { BaseApiClient } from "./base-client";
import type { CompanyInfo } from "../types";

export class CompanyClient extends BaseApiClient {
  async getCompanyInfo(): Promise<CompanyInfo | null> {
    const response = await this.request<CompanyInfo | null>("/api/company");
    return response.data || null;
  }

  async updateCompanyInfo(payload: Partial<CompanyInfo>): Promise<CompanyInfo> {
    const response = await this.request<CompanyInfo>("/api/company", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Erreur lors de la mise à jour");
    }

    return response.data;
  }
}