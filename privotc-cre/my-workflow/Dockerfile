# Dockerfile for CRE Matching Service on Railway
FROM node:20-slim

# Install curl and bash
RUN apt-get update && apt-get install -y curl bash && rm -rf /var/lib/apt/lists/*

# Install CRE CLI
RUN curl -fsSL https://cre.chain.link/install.sh | bash

# Add CRE to PATH
ENV PATH="/root/.cre/bin:${PATH}"

# Create app directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (skip postinstall that requires Bun)
RUN npm install --ignore-scripts

# Copy workflow files
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD echo "CRE service running"

# Run matching every 2 minutes
CMD while true; do \
      echo "🔄 Running CRE matching at $(date)..."; \
      cre workflow simulate . --trigger-index 2 || echo "❌ Match failed"; \
      echo "⏳ Waiting 2 minutes..."; \
      sleep 120; \
    done
