import { ModuleOpenApiDoc, OpenApiPathItem } from "./types";
import agent_doc from "../modules/agent/openapi.doc";
import chatSystem_doc from "../modules/chatSystem/openapi.doc";
import client_doc from "../modules/client/openapi.doc";
import CO_doc from "../modules/CO/openapi.doc";
import comments_doc from "../modules/comments/openapi.doc";
import communications_doc from "../modules/communications/openapi.doc";
import connectionDesign_doc from "../modules/connectionDesign/openapi.doc";
import dashboradData_doc from "../modules/dashboradData/openapi.doc";
import department_doc from "../modules/department/openapi.doc";
import designDrawings_doc from "../modules/designDrawings/openapi.doc";
import estimation_doc from "../modules/estimation/openapi.doc";
import fabricator_doc from "../modules/fabricator/openapi.doc";
import invoice_doc from "../modules/invoice/openapi.doc";
import meetings_doc from "../modules/meetings/openapi.doc";
import milestone_doc from "../modules/milestone/openapi.doc";
import notifications_doc from "../modules/notifications/openapi.doc";
import project_doc from "../modules/project/openapi.doc";
import RFI_doc from "../modules/RFI/openapi.doc";
import RFQ_doc from "../modules/RFQ/openapi.doc";
import scores_doc from "../modules/scores/openapi.doc";
import submittals_doc from "../modules/submittals/openapi.doc";
import tasks_doc from "../modules/tasks/openapi.doc";
import team_doc from "../modules/team/openapi.doc";
import uploads_doc from "../modules/uploads/openapi.doc";
import user_doc from "../modules/user/openapi.doc";
import vendors_doc from "../modules/vendors/openapi.doc";
import workingHours_doc from "../modules/workingHours/openapi.doc";

const moduleDocs: ModuleOpenApiDoc[] = [
  agent_doc,
  chatSystem_doc,
  client_doc,
  CO_doc,
  comments_doc,
  communications_doc,
  connectionDesign_doc,
  dashboradData_doc,
  department_doc,
  designDrawings_doc,
  estimation_doc,
  fabricator_doc,
  invoice_doc,
  meetings_doc,
  milestone_doc,
  notifications_doc,
  project_doc,
  RFI_doc,
  RFQ_doc,
  scores_doc,
  submittals_doc,
  tasks_doc,
  team_doc,
  uploads_doc,
  user_doc,
  vendors_doc,
  workingHours_doc,
];

const mergePaths = (docs: ModuleOpenApiDoc[]) => {
  const merged: Record<string, OpenApiPathItem> = {};

  for (const doc of docs) {
    for (const [path, pathItem] of Object.entries(doc.paths)) {
      merged[path] = {
        ...(merged[path] || {}),
        ...pathItem,
      };
    }
  }

  return merged;
};

export const buildOpenApiSpec = () => {
  const version = process.env.npm_package_version || "1.0.0";
  const tags = moduleDocs
    .flatMap((doc) => doc.tags ?? (doc.tag ? [doc.tag] : []))
    .filter(
      (tag, idx, arr) => arr.findIndex((item) => item.name === tag.name) === idx
    );

  return {
    openapi: "3.0.3",
    info: {
      title: "P-T Backend API",
      version,
      description:
        "Auto-generated OpenAPI docs from module-level openapi.doc.ts files.",
    },
    servers: [
      {
        url: "/v1",
        description: "Current server",
      },
    ],
    tags,
    paths: mergePaths(moduleDocs),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  };
};
