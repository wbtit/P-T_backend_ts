import { ModuleOpenApiDoc } from "../../openapi/types";

export const commentsOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Comments",
    description: "API endpoints for Comments module"
  },
  paths: {
    // This module currently has no HTTP routes mounted in app.ts.
  }
};

export default commentsOpenApiDoc;
