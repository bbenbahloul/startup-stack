FROM node:22-alpine

WORKDIR /app

# 1. Install Backend Dependencies
COPY package*.json ./
RUN npm install

# 2. Install Frontend Dependencies
COPY client/package*.json ./client/
RUN cd client && npm install

# 3. Copy Source Code
COPY . .

# 4. Build Frontend
# This creates the /app/client/dist folder with HTML/JS/CSS
RUN cd client && npm run build

# 5. Expose & Start
EXPOSE 3000
CMD ["node", "server.js"]