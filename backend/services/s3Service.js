import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

export const uploadFileToS3 = async (file, key) => {
    const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
    } catch (error) {
        throw new Error(`S3 upload failed: ${error.message}`);
    }
};

export const deleteFileFromS3 = async (key) => {
    const deleteParams = {
        Bucket: BUCKET_NAME,
        Key: key,
    };

    try {
        const command = new DeleteObjectCommand(deleteParams);
        await s3Client.send(command);
        return true;
    } catch (error) {
        throw new Error(`S3 delete failed: ${error.message}`);
    }
};