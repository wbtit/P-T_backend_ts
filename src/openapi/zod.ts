import z from "zod";

const toSafeJsonSchema = (schema: z.ZodTypeAny) => {
  try {
    return z.toJSONSchema(schema, {
      io: "input",
      unrepresentable: "any",
    });
  } catch {
    return {
      type: "object",
      additionalProperties: true,
      description: "Schema could not be fully represented from Zod",
    };
  }
};

export const zodRequestBody = (schema: z.ZodTypeAny) => ({
  required: true,
  content: {
    "application/json": {
      schema: toSafeJsonSchema(schema),
    },
  },
});

export const genericRequestBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        additionalProperties: true,
        description: "Request payload for this endpoint",
      },
    },
  },
};
