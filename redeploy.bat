SET CONTAINER=pokemon-api
SET IMAGE=pokemon-api-image

if `docker ps -q --filter "name=%CONTAINER%"` (
    docker kill $CONTAINER
)
IF `docker ps -aq --filter "name=%CONTAINER%"` (
    docker rm $CONTAINER
)
IF EXIST "Dockerfile" (
    docker build --tag="%IMAGE%" .
)

docker run -dP -p 80:8080 --name="%CONTAINER%" $IMAGE
