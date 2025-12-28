FROM node:18

WORKDIR /app

COPY package*.json ./

# ✅ Install ALL deps (including devDependencies)
RUN npm install

COPY . .

# ✅ Now tsc exists
RUN npm run build

# ✅ Run compiled JS only
CMD ["npm", "run", "start"]
