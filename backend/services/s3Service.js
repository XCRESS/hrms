import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;


class S3Service {
    generateFileKey(employeeId, fileName, isProfilePicture = false) {
        const uniqueId = uuidv4();
        const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
        
        if (isProfilePicture) {
            return `${employeeId}/profile/${uniqueId}${fileExtension}`;
        }
        
        return `${employeeId}/documents/${uniqueId}_${fileName}`;
    }

    async uploadFile(file, employeeId, isProfilePicture = false) {
        const fileKey = this.generateFileKey(employeeId, file.originalname, isProfilePicture);
        
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        
        return {
            url: `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`,
            key: fileKey
        };
    }

    async deleteFile(fileUrl) {
        const fileKey = fileUrl.split('.amazonaws.com/')[1];
        if (!fileKey) return;
        
        const deleteParams = {
            Bucket: BUCKET_NAME,
            Key: fileKey,
        };

        const command = new DeleteObjectCommand(deleteParams);
        await s3Client.send(command);
    }
}

export default new S3Service();