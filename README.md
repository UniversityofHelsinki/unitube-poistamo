## Environment variables
Create and add environment variables in .env file:
postgres_user = xxxxxxx
password = xxxxxx
port = 5432
host = localhost
database= expired_videos

## Start postgres as Docker container
docker run --name ohtu-postgres -p 5432:5432  -e POSTGRES_DB=expired_videos -e POSTGRES_PASSWORD=xxxxxxxxxxxxxx -d onjin/alpine-postgres

## Install application dependencies
npm install

## Start application:
node index.js
