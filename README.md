## Local Development Environment

## Environment variables
Create and add environment variables in .env file:  
POSTGRES_USER = postgres  
PASSWORD = xxxxxx  
PORT = 5432  
HOST = localhost  
DATABASE= expired_videos  


POISTAMO_OPENCAST_HOST (OpenCast development url)
POISTAMO_OPENCAST_USER (found in keepass)
POISTAMO_OPENCAST_PASS (found in keepass)
POISTAMO_OPENCAST_ARCHIVED_SERIES = (archived series unique identifier)

## Start postgres as Docker container
docker run --name exp-videos-postgres -p 5432:5432  -e POSTGRES_DB=expired_videos -e POSTGRES_PASSWORD=xxxxxx -d onjin/alpine-postgres

## Install application dependencies
npm install

## Start application:
node index.js


## Environments and deployments
### Development environment in OpenShift
master branch deploys to test Openshift project named Poistamo with labeling poistamo-dev
development environment communicates with Opencast test environment https://ocast-devel-a1.it.helsinki.fi 

### Test environment in OpenShift
master branch deploys to test Openshift project named Poistamo with labeling poistamo-test
test environment communicates with devel Opencast https://ocast-a1-test.it.helsinki.fi (used for Version Switching)

### Production environment in OpenShift
master branch deploys to production Openshift project named Poistamo with labeling poistamo-prod
production environment communicates with production Opencast https://webcast.it.helsinki.fi
