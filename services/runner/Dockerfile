FROM node:18

RUN apt-get update && apt-get install -y git

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "run", "start"]
