const Minio = require("minio");
require("dotenv").config();

const minioClient = new Minio.Client({
	endPoint: process.env.E2E_STORAGE_URL,
	useSSL: true,
	accessKey: process.env.E2E_STORAGE_ACCESS_KEY,
	secretKey: process.env.E2E_STORAGE_SECRET_KEY,
});

const bucket = process.env.E2E_STORAGE_BUCKET;

async function uploadToStorage(file, fileName, mimeType) {
	try {
		const sourceFile = file;

		const destinationObject = `${fileName}`;

		const doesBucketExist = await minioClient.bucketExists(bucket);

		if (!doesBucketExist) {
			await minioClient.makeBucket(bucket, "us-east-1");
		}

		const metaData = {
			"Content-Type": mimeType,
		};

		await minioClient.putObject(
			bucket,
			destinationObject,
			sourceFile,
			metaData
		);

		//1-week expiry
		const linkExpiry = 7 * 24 * 60 * 60;

		let fileUrl = await minioClient.presignedUrl(
			"GET",
			bucket,
			destinationObject,
			linkExpiry
		);

		return fileUrl;
	} catch (error) {
		console.error("Error -> uploadToStorage", error);
		throw error;
	}
}

async function getPreSignedProfileImageUrl(userId) {
	const linkExpiry = 7 * 24 * 60 * 60;

	const destinationObject = `${userId}_photo`;

	let fileUrl = await minioClient.presignedUrl(
		"GET",
		bucket,
		destinationObject,
		linkExpiry
	);

	return fileUrl;
}

module.exports = { uploadToStorage, getPreSignedProfileImageUrl };
