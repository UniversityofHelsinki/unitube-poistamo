## Environment variables
Create and add environment variables in .env file:  
POSTGRES_USER = postgres  
PASSWORD = xxxxxx  
PORT = 5432  
HOST = localhost  
DATABASE= expired_videos  

## Start postgres as Docker container
docker run --name exp-videos-postgres -p 5432:5432  -e POSTGRES_DB=expired_videos -e POSTGRES_PASSWORD=xxxxxx -d onjin/alpine-postgres

## Install application dependencies
npm install

## Start application:
node index.js
