export interface ProposalTemplate {
  id: string;
  name: string;
  termsAndConditions: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface CreateTemplateInput {
  name: string;
  termsAndConditions: string;
  isDefault?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  termsAndConditions?: string;
  isDefault?: boolean;
}
