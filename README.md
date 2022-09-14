## Local Development Environment

## Environment variables
Create an .env file to the project's root directory and add the values below.
Note the instructions for certain values marked with <>.

*POSTGRES_USER = postgres*
*PASSWORD = __<define a custom password for local development>__*
*PORT = 5432*
*HOST = localhost*  
*DATABASE= expired_videos*

_CRON_START_TIME=0 0 * * *_

*POISTAMO_OPENCAST_HOST = __<OpenCast development url, see values below (locally http&#65279;://localhost:8080)>__*
*POISTAMO_OPENCAST_USER = __<insert value from Keepass>__*
*POISTAMO_OPENCAST_PASS = __<insert value from Keepass>__*
*POISTAMO_OPENCAST_ARCHIVED_SERIES = __<insert the unique identifier of the 'archived' series created in OpenCast>__*

## Start postgres as Docker container

_docker run --name exp_videos_postgres -p 5432:5432 -e POSTGRES_PASSWORD=xxxxxxx -e POSTGRES_DB=expired_videos -d postgres:14-alpine_

(note: use the same POSTGRES_PASSWORD as defined in the previous step!)

## Install application dependencies
Run the following command:
_npm install_

## Start application:
Run the following command:
_node index.js_


## Environments and deployments
### Development environment in OpenShift
main branch deploys to test Openshift project named Poistamo with labeling poistamo-dev
development environment communicates with Opencast test environment https://ocast-devel-a1.it.helsinki.fi 

### Test environment in OpenShift
test branch deploys to test Openshift project named Poistamo with labeling poistamo-test
test environment communicates with devel Opencast https://ocast-a1-test.it.helsinki.fi (used for Version Switching)

### Production environment in OpenShift
prod branch deploys to production Openshift project named Poistamo with labeling poistamo-prod
production environment communicates with production Opencast https://webcast.it.helsinki.fi
