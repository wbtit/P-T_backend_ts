import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { CreateProjectSchema, UpdateProjectSchema } from "./dtos";
import { JobStudyRequestSchema, JobStudySchema } from "./jobStudy/dtos";
import { NoteSchema, NoteUpdateSchema } from "./notes";
import { ProjectLineItemBulkSchema, UpdateProjectLineItemSchema } from "./projectLineItems";
import { CreateWbsBundleTemplateDto, UpdateWbsBundleTemplateDto } from "./WBS/WbsTemplates/dtos/wbsBundle.dto";
import { CreateWbsLineItemTemplateDto, UpdateWbsLineItemTemplateDto } from "./WBS/WbsTemplates/dtos/wbsLineItemTemplates.dto";
import { CreateWbsTemplateDto, UpdateWbsTemplateDto } from "./WBS/WbsTemplates/dtos/wbsTemplate.dto";

export const projectOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Project",
    description: "API endpoints for Project module"
  },
  paths: {
    "/project/job-studies": {
      post: {
        tags: ["Project"],
        summary: "POST /project/job-studies",
        operationId: "post_project_project_job_studies",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(JobStudyRequestSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/job-studies/{id}": {
      get: {
        tags: ["Project"],
        summary: "GET /project/job-studies/{id}",
        operationId: "get_project_project_job_studies_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      put: {
        tags: ["Project"],
        summary: "PUT /project/job-studies/{id}",
        operationId: "put_project_project_job_studies_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(JobStudySchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/line-items/bulk": {
      patch: {
        tags: ["Project"],
        summary: "PATCH /project/line-items/bulk",
        operationId: "patch_project_project_line_items_bulk",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(ProjectLineItemBulkSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/line-items/{lineItemId}": {
      patch: {
        tags: ["Project"],
        summary: "PATCH /project/line-items/{lineItemId}",
        operationId: "patch_project_project_line_items_lineItemId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "lineItemId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateProjectLineItemSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/project-wbs/{projectWbsId}/line-items": {
      get: {
        tags: ["Project"],
        summary: "GET /project/project-wbs/{projectWbsId}/line-items",
        operationId: "get_project_project_project_wbs_projectWbsId_line_items",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectWbsId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects": {
      get: {
        tags: ["Project"],
        summary: "GET /project/projects",
        operationId: "get_project_project_projects",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["Project"],
        summary: "POST /project/projects",
        operationId: "post_project_project_projects",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateProjectSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects/{id}": {
      delete: {
        tags: ["Project"],
        summary: "DELETE /project/projects/{id}",
        operationId: "delete_project_project_projects_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      get: {
        tags: ["Project"],
        summary: "GET /project/projects/{id}",
        operationId: "get_project_project_projects_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      put: {
        tags: ["Project"],
        summary: "PUT /project/projects/{id}",
        operationId: "put_project_project_projects_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateProjectSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects/{projectId}/bundles": {
      get: {
        tags: ["Project"],
        summary: "GET /project/projects/{projectId}/bundles",
        operationId: "get_project_project_projects_projectId_bundles",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects/{projectId}/dashboard/{stage}": {
      get: {
        tags: ["Project"],
        summary: "GET /project/projects/{projectId}/dashboard/{stage}",
        operationId: "get_project_project_projects_projectId_dashboard_stage",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
          { in: "path", name: "stage", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects/{projectId}/dashboard/{stage}/bundle/{bundleKey}": {
      get: {
        tags: ["Project"],
        summary: "GET /project/projects/{projectId}/dashboard/{stage}/bundle/{bundleKey}",
        operationId: "get_project_project_projects_projectId_dashboard_stage_bundle_bundleKey",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
          { in: "path", name: "stage", required: true, schema: { type: "string" } },
          { in: "path", name: "bundleKey", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects/{projectId}/dashboard/{stage}/category/{category}": {
      get: {
        tags: ["Project"],
        summary: "GET /project/projects/{projectId}/dashboard/{stage}/category/{category}",
        operationId: "get_project_project_projects_projectId_dashboard_stage_category_category",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
          { in: "path", name: "stage", required: true, schema: { type: "string" } },
          { in: "path", name: "category", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects/{projectId}/dashboard/{stage}/discipline/{discipline}": {
      get: {
        tags: ["Project"],
        summary: "GET /project/projects/{projectId}/dashboard/{stage}/discipline/{discipline}",
        operationId: "get_project_project_projects_projectId_dashboard_stage_discipline_discipline",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
          { in: "path", name: "stage", required: true, schema: { type: "string" } },
          { in: "path", name: "discipline", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects/{projectId}/files/{fileId}": {
      get: {
        tags: ["Project"],
        summary: "GET /project/projects/{projectId}/files/{fileId}",
        operationId: "get_project_project_projects_projectId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects/{projectId}/notes": {
      get: {
        tags: ["Project"],
        summary: "GET /project/projects/{projectId}/notes",
        operationId: "get_project_project_projects_projectId_notes",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["Project"],
        summary: "POST /project/projects/{projectId}/notes",
        operationId: "post_project_project_projects_projectId_notes",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(NoteSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects/{projectId}/notes/{id}": {
      delete: {
        tags: ["Project"],
        summary: "DELETE /project/projects/{projectId}/notes/{id}",
        operationId: "delete_project_project_projects_projectId_notes_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      get: {
        tags: ["Project"],
        summary: "GET /project/projects/{projectId}/notes/{id}",
        operationId: "get_project_project_projects_projectId_notes_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      put: {
        tags: ["Project"],
        summary: "PUT /project/projects/{projectId}/notes/{id}",
        operationId: "put_project_project_projects_projectId_notes_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(NoteUpdateSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects/{projectId}/update-history": {
      get: {
        tags: ["Project"],
        summary: "GET /project/projects/{projectId}/update-history",
        operationId: "get_project_project_projects_projectId_update_history",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/projects/{projectId}/wbs/expand": {
      post: {
        tags: ["Project"],
        summary: "POST /project/projects/{projectId}/wbs/expand",
        operationId: "post_project_project_projects_projectId_wbs_expand",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
        ],
        requestBody: genericRequestBody,
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/viewFile/{projectId}/{fileId}": {
      get: {
        tags: ["Project"],
        summary: "GET /project/viewFile/{projectId}/{fileId}",
        operationId: "get_project_project_viewFile_projectId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/project/wbs/bundles": {
      get: {
        tags: ["Project"],
        summary: "GET /project/wbs/bundles",
        operationId: "get_project_project_wbs_bundles",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/wbsTemplates/admin/templates/bundles": {
      get: {
        tags: ["Project"],
        summary: "GET /wbsTemplates/admin/templates/bundles",
        operationId: "get_project_wbsTemplates_admin_templates_bundles",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      post: {
        tags: ["Project"],
        summary: "POST /wbsTemplates/admin/templates/bundles",
        operationId: "post_project_wbsTemplates_admin_templates_bundles",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateWbsBundleTemplateDto),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/wbsTemplates/admin/templates/bundles/{bundleKey}": {
      put: {
        tags: ["Project"],
        summary: "PUT /wbsTemplates/admin/templates/bundles/{bundleKey}",
        operationId: "put_project_wbsTemplates_admin_templates_bundles_bundleKey",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "bundleKey", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateWbsBundleTemplateDto),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/wbsTemplates/admin/templates/line-items": {
      post: {
        tags: ["Project"],
        summary: "POST /wbsTemplates/admin/templates/line-items",
        operationId: "post_project_wbsTemplates_admin_templates_line_items",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateWbsLineItemTemplateDto),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/wbsTemplates/admin/templates/line-items/{id}": {
      put: {
        tags: ["Project"],
        summary: "PUT /wbsTemplates/admin/templates/line-items/{id}",
        operationId: "put_project_wbsTemplates_admin_templates_line_items_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateWbsLineItemTemplateDto),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/wbsTemplates/admin/templates/wbs": {
      post: {
        tags: ["Project"],
        summary: "POST /wbsTemplates/admin/templates/wbs",
        operationId: "post_project_wbsTemplates_admin_templates_wbs",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateWbsTemplateDto),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/wbsTemplates/admin/templates/wbs/{id}": {
      put: {
        tags: ["Project"],
        summary: "PUT /wbsTemplates/admin/templates/wbs/{id}",
        operationId: "put_project_wbsTemplates_admin_templates_wbs_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateWbsTemplateDto),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
  }
};

export default projectOpenApiDoc;
