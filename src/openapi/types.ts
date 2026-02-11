export type OpenApiMethod = "get" | "post" | "put" | "delete" | "patch";

export type OpenApiOperation = {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
  security?: Array<Record<string, string[]>>;
};

export type OpenApiPathItem = Partial<Record<OpenApiMethod, OpenApiOperation>> & {
  summary?: string;
  description?: string;
};

export type ModuleOpenApiDoc = {
  tag?: {
    name: string;
    description?: string;
  };
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  paths: Record<string, OpenApiPathItem>;
};
