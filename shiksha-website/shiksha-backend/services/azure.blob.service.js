const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
require("dotenv").config();

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

const credential = new DefaultAzureCredential();

const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);

async function uploadToStorage(file, fileName, mimeType) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const containerExists = await containerClient.exists();
        if (!containerExists) {
            await containerClient.create();
        }

        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        await blockBlobClient.uploadData(file, {
            blobHTTPHeaders: { blobContentType: mimeType },
        });

        const linkExpiryInSeconds = 7 * 24 * 60 * 60;
        const fileUrl = await getPreSignedUrl(fileName, linkExpiryInSeconds);

        return fileUrl;
    } catch (error) {
        console.error("Error -> uploadToStorage", error);
        throw error;
    }
}

async function getPreSignedUrl(blobName, expiryInSeconds) {
    const now = new Date();
    const expiryTime = new Date(now);
    expiryTime.setSeconds(now.getSeconds() + expiryInSeconds);

    const sasToken = generateBlobSASQueryParameters(
        {
            containerName,
            blobName,
            permissions: BlobSASPermissions.parse("r"),
			startsOn: now, 
            expiresOn: expiryTime,
        },
		(await blobServiceClient.getUserDelegationKey(now, expiryTime)),
		accountName
    ).toString();

    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
    return blobUrl;
}

async function getPreSignedProfileImageUrl(userId) {
    const linkExpiryInSeconds = 7 * 24 * 60 * 60;
    const destinationObject = `${userId}_photo`;
    const fileUrl = await getPreSignedUrl(destinationObject, linkExpiryInSeconds);
    return fileUrl;
}

module.exports = { uploadToStorage, getPreSignedProfileImageUrl };
