#!/bin/bash

# Docker build and push script for Shiksha API
# Usage: ./build-and-push.sh <acr-name> <image-tag>
# Example: ./build-and-push.sh myacr latest

set -e

# Check if required arguments are provided
if [ $# -lt 2 ]; then
    echo "Usage: $0 <acr-name> <image-tag>"
    echo "Example: $0 myacr latest"
    exit 1
fi

ACR_NAME=$1
IMAGE_TAG=$2
IMAGE_NAME="shiksha-api"
FULL_IMAGE_NAME="${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Building Docker image..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "Tagging image for ACR..."
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${FULL_IMAGE_NAME}

echo "Logging into ACR..."
az acr login --name ${ACR_NAME}

echo "Pushing image to ACR..."
docker push ${FULL_IMAGE_NAME}

echo "Successfully pushed image: ${FULL_IMAGE_NAME}"
echo ""
echo "To deploy to App Service, use:"
echo "az webapp config container set \\"
echo "  --name <app-name> \\"
echo "  --resource-group <resource-group> \\"
echo "  --docker-custom-image-name ${FULL_IMAGE_NAME}"
