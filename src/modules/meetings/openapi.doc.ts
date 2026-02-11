import { ModuleOpenApiDoc } from "../../openapi/types";
import { genericRequestBody, zodRequestBody } from "../../openapi/zod";
import { CreateMeetingSchema, UpdateMeetingAttendeeSchema, UpdateMeetingSchema } from "./dtos";

export const meetingsOpenApiDoc: ModuleOpenApiDoc = {
  tag: {
    name: "Meetings",
    description: "API endpoints for Meetings module"
  },
  paths: {
    "/meetings": {
      post: {
        tags: ["Meetings"],
        summary: "POST /meetings",
        operationId: "post_meetings_meetings",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(CreateMeetingSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/attendance": {
      post: {
        tags: ["Meetings"],
        summary: "POST /meetings/attendance",
        operationId: "post_meetings_meetings_attendance",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(UpdateMeetingAttendeeSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/attendance/history": {
      get: {
        tags: ["Meetings"],
        summary: "GET /meetings/attendance/history",
        operationId: "get_meetings_meetings_attendance_history",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/participants": {
      post: {
        tags: ["Meetings"],
        summary: "POST /meetings/participants",
        operationId: "post_meetings_meetings_participants",
        security: [{ bearerAuth: [] }],
        requestBody: zodRequestBody(UpdateMeetingAttendeeSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/participants/{attendeeId}": {
      delete: {
        tags: ["Meetings"],
        summary: "DELETE /meetings/participants/{attendeeId}",
        operationId: "delete_meetings_meetings_participants_attendeeId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "attendeeId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
      put: {
        tags: ["Meetings"],
        summary: "PUT /meetings/participants/{attendeeId}",
        operationId: "put_meetings_meetings_participants_attendeeId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "attendeeId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateMeetingAttendeeSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/status/count": {
      get: {
        tags: ["Meetings"],
        summary: "GET /meetings/status/count",
        operationId: "get_meetings_meetings_status_count",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/user/me": {
      get: {
        tags: ["Meetings"],
        summary: "GET /meetings/user/me",
        operationId: "get_meetings_meetings_user_me",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/user/me/past": {
      get: {
        tags: ["Meetings"],
        summary: "GET /meetings/user/me/past",
        operationId: "get_meetings_meetings_user_me_past",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/user/me/upcoming": {
      get: {
        tags: ["Meetings"],
        summary: "GET /meetings/user/me/upcoming",
        operationId: "get_meetings_meetings_user_me_upcoming",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/viewFile/{meetingId}/{fileId}": {
      get: {
        tags: ["Meetings"],
        summary: "GET /meetings/viewFile/{meetingId}/{fileId}",
        operationId: "get_meetings_meetings_viewFile_meetingId_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "meetingId", required: true, schema: { type: "string" } },
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
    "/meetings/{id}": {
      delete: {
        tags: ["Meetings"],
        summary: "DELETE /meetings/{id}",
        operationId: "delete_meetings_meetings_id",
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
        tags: ["Meetings"],
        summary: "GET /meetings/{id}",
        operationId: "get_meetings_meetings_id",
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
        tags: ["Meetings"],
        summary: "PUT /meetings/{id}",
        operationId: "put_meetings_meetings_id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateMeetingSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/{id}/status": {
      patch: {
        tags: ["Meetings"],
        summary: "PATCH /meetings/{id}/status",
        operationId: "patch_meetings_meetings_id_status",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateMeetingSchema),
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/{id}/summary": {
      get: {
        tags: ["Meetings"],
        summary: "GET /meetings/{id}/summary",
        operationId: "get_meetings_meetings_id_summary",
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
    },
    "/meetings/{meetingId}/attendance": {
      get: {
        tags: ["Meetings"],
        summary: "GET /meetings/{meetingId}/attendance",
        operationId: "get_meetings_meetings_meetingId_attendance",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "meetingId", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Success" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "500": { description: "Internal Server Error" }
        }
      },
    },
    "/meetings/{meetingId}/files/{fileId}": {
      get: {
        tags: ["Meetings"],
        summary: "GET /meetings/{meetingId}/files/{fileId}",
        operationId: "get_meetings_meetings_meetingId_files_fileId",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "meetingId", required: true, schema: { type: "string" } },
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
    "/meetings/{meetingId}/rsvp": {
      patch: {
        tags: ["Meetings"],
        summary: "PATCH /meetings/{meetingId}/rsvp",
        operationId: "patch_meetings_meetings_meetingId_rsvp",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "meetingId", required: true, schema: { type: "string" } },
        ],
        requestBody: zodRequestBody(UpdateMeetingAttendeeSchema),
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

export default meetingsOpenApiDoc;
