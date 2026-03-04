FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm i -g pnpm && pnpm install --no-frozen-lockfile
CMD ["pnpm", "dev"]