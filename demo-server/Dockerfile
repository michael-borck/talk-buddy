FROM node:22-alpine

WORKDIR /app
COPY server.js .

ENV NODE_ENV=production
# The image holds no secrets — everything sensitive arrives via env_file.
USER node
EXPOSE 8787

CMD ["node", "server.js"]
