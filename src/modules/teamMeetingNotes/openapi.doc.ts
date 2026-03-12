import { ModuleOpenApiDoc } from "../../openapi/types";

const teamMeetingNotesFormBody = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        required: ["title", "content", "projectId"],
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          meetingId: { type: "string", format: "uuid" },
          projectId: { type: "string", format: "uuid" },
          visibility: { type: "string", enum: ["INTERNAL", "EXTERNAL"] },
          files: { type: "array", items: { type: "string", format: "binary" } },
        },
      },
    },
  },
};

const teamMeetingNotesUpdateFormBody = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          visibility: { type: "string", enum: ["INTERNAL", "EXTERNAL"] },
          files: { type: "array", items: { type: "string", format: "binary" } },
        },
      },
    },
  },
};

export const teamMeetingNotesOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "TeamMeetingNotes",
    description: "API endpoints for Team Meeting Notes",
  },
  paths: {
    "/team-meeting-notes": {
      post: {
        tags: ["TeamMeetingNotes"],
        summary: "POST /team-meeting-notes",
        operationId: "post_team_meeting_notes",
        security: [{ bearerAuth: [] }],
        requestBody: teamMeetingNotesFormBody,
        responses: {
          "201": { description: "Team meeting note created successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
      get: {
        tags: ["TeamMeetingNotes"],
        summary: "GET /team-meeting-notes",
        operationId: "get_team_meeting_notes_all",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Team meeting notes fetched successfully" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/team-meeting-notes/{id}": {
      get: {
        tags: ["TeamMeetingNotes"],
        summary: "GET /team-meeting-notes/{id}",
        operationId: "get_team_meeting_notes_by_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Team meeting note fetched successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
          "500": { description: "Internal Server Error" },
        },
      },
      put: {
        tags: ["TeamMeetingNotes"],
        summary: "PUT /team-meeting-notes/{id}",
        operationId: "put_team_meeting_notes_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: teamMeetingNotesUpdateFormBody,
        responses: {
          "200": { description: "Team meeting note updated successfully" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
      delete: {
        tags: ["TeamMeetingNotes"],
        summary: "DELETE /team-meeting-notes/{id}",
        operationId: "delete_team_meeting_notes_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "204": { description: "Team meeting note deleted successfully" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/team-meeting-notes/project/{projectId}": {
      get: {
        tags: ["TeamMeetingNotes"],
        summary: "GET /team-meeting-notes/project/{projectId}",
        operationId: "get_team_meeting_notes_by_project",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "projectId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Team meeting notes fetched successfully" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/team-meeting-notes/meeting/{meetingId}": {
      get: {
        tags: ["TeamMeetingNotes"],
        summary: "GET /team-meeting-notes/meeting/{meetingId}",
        operationId: "get_team_meeting_notes_by_meeting",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "meetingId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Team meeting notes fetched successfully" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/team-meeting-notes/file/{noteId}/{fileId}": {
      get: {
        tags: ["TeamMeetingNotes"],
        summary: "GET /team-meeting-notes/file/{noteId}/{fileId}",
        operationId: "get_team_meeting_notes_file",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "noteId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "File fetched successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "File not found" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/team-meeting-notes/viewFile/{noteId}/{fileId}": {
      get: {
        tags: ["TeamMeetingNotes"],
        summary: "GET /team-meeting-notes/viewFile/{noteId}/{fileId}",
        operationId: "get_team_meeting_notes_view_file",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "noteId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "File streamed successfully" },
          "401": { description: "Unauthorized" },
          "404": { description: "File not found" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
  },
};

export default teamMeetingNotesOpenApiDoc;
