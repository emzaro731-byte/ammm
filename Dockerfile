FROM node:20-bookworm-slim
WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/ ./
ENV NODE_ENV=production
EXPOSE 10000
CMD ["node","server.js"]
