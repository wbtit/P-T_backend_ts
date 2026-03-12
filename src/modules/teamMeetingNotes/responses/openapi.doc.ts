import { ModuleOpenApiDoc } from "../../../openapi/types";
import { TeamMeetingNoteResponseSchema } from "./dtos";

const responseFormBody = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string" },
          parentResponseId: { type: "string", format: "uuid" },
          files: { type: "array", items: { type: "string", format: "binary" } },
        },
      },
    },
  },
};

export const teamMeetingNoteResponsesOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "TeamMeetingNoteResponses",
    description: "API endpoints for Team Meeting Note Responses",
  },
  paths: {
    "/team-meeting-notes/{noteId}/responses": {
      post: {
        tags: ["TeamMeetingNoteResponses"],
        summary: "POST /team-meeting-notes/{noteId}/responses",
        operationId: "post_team_meeting_note_response",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "noteId", required: true, schema: { type: "string" } },
        ],
        requestBody: responseFormBody,
        responses: {
          "201": { description: "Team meeting note response created" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
      get: {
        tags: ["TeamMeetingNoteResponses"],
        summary: "GET /team-meeting-notes/{noteId}/responses",
        operationId: "get_team_meeting_note_responses_by_note",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "noteId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Team meeting note responses fetched" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/team-meeting-notes/responses/{id}": {
      get: {
        tags: ["TeamMeetingNoteResponses"],
        summary: "GET /team-meeting-notes/responses/{id}",
        operationId: "get_team_meeting_note_response_by_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Team meeting note response fetched" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
          "500": { description: "Internal Server Error" },
        },
      },
      put: {
        tags: ["TeamMeetingNoteResponses"],
        summary: "PUT /team-meeting-notes/responses/{id}",
        operationId: "put_team_meeting_note_response_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: responseFormBody,
        responses: {
          "200": { description: "Team meeting note response updated" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
      delete: {
        tags: ["TeamMeetingNoteResponses"],
        summary: "DELETE /team-meeting-notes/responses/{id}",
        operationId: "delete_team_meeting_note_response_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "204": { description: "Team meeting note response deleted" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/team-meeting-notes/responses/file/{responseId}/{fileId}": {
      get: {
        tags: ["TeamMeetingNoteResponses"],
        summary: "GET /team-meeting-notes/responses/file/{responseId}/{fileId}",
        operationId: "get_team_meeting_note_response_file",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "responseId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "File fetched" },
          "401": { description: "Unauthorized" },
          "404": { description: "File not found" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
    "/team-meeting-notes/responses/viewFile/{responseId}/{fileId}": {
      get: {
        tags: ["TeamMeetingNoteResponses"],
        summary: "GET /team-meeting-notes/responses/viewFile/{responseId}/{fileId}",
        operationId: "get_team_meeting_note_response_view_file",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "responseId", required: true, schema: { type: "string" } },
          { in: "path", name: "fileId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "File streamed" },
          "401": { description: "Unauthorized" },
          "404": { description: "File not found" },
          "500": { description: "Internal Server Error" },
        },
      },
    },
  },
};

export default teamMeetingNoteResponsesOpenApiDoc;
