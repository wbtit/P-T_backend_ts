#############################################
# Stage 1 — Base
#############################################
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

#############################################
# Stage 2 — Install all dependencies and build
#############################################
FROM base AS builder
RUN npm install
COPY . .
RUN npm run build
RUN npx prisma generate

#############################################
# Stage 3 — Runtime
#############################################
FROM base AS runtime

# Install ONLY production dependencies, skipping devDependencies
RUN npm install --omit=dev

# Add a non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy artifacts from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma

# Generate the Prisma client again to ensure correct runtime binaries.
# This must be done as root, before switching to the non-root user.
RUN npx prisma generate --no-engine

# Create the directory for uploads and grant ownership to the appuser
RUN mkdir -p /app/public && chown -R appuser:appgroup /app/public

# Switch to the non-root user before running the app
USER appuser

EXPOSE 5156

# Use the npm script from package.json for consistency
CMD [ "npm", "run", "serve" ]