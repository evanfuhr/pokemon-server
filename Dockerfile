FROM ubuntu

RUN apt-get update
RUN apt-get install nano nodejs -y

COPY package.json package.json
RUN npm install

COPY . .
EXPOSE 3000
CMD ["npm start"]