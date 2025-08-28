import React, { useState } from 'react';
import { Upload, X, File, Plus } from 'lucide-react';
import { useToast } from './toast';
import apiClient from '../../service/apiClient';

const FileUpload = ({ 
    employeeId, 
    documentType = 'document', 
    currentFile = null, 
    onFileChange = () => {}, 
    accept = "image/*,.pdf",
    maxSize = "10MB"
}) => {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState(currentFile);

    const handleFileSelect = async (event) => {
        const selectedFile = event.target.files[0];
        if (!selectedFile) return;

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('document', selectedFile);
            formData.append('employeeId', employeeId);
            formData.append('documentType', documentType);

            const response = await apiClient.post('/documents/upload', formData);

            setFile(response.document);
            onFileChange(response.document);
            
            toast({
                title: "Success",
                description: "File uploaded successfully",
                variant: "default"
            });
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to upload file",
                variant: "destructive"
            });
        } finally {
            setUploading(false);
        }
    };

    const handleFileDelete = async () => {
        if (!file) return;

        try {
            await apiClient.delete(`/documents/${file._id}`);
            
            setFile(null);
            onFileChange(null);
            
            toast({
                title: "Success",
                description: "File deleted successfully",
                variant: "default"
            });
        } catch (error) {
            console.error('Delete error:', error);
            toast({
                title: "Error",
                description: "Failed to delete file",
                variant: "destructive"
            });
        }
    };

    const isImage = (fileName) => {
        return /\.(jpg|jpeg|png|gif)$/i.test(fileName);
    };

    return (
        <div className="space-y-3">
            {!file ? (
                /* Upload Area */
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                        type="file"
                        accept={accept}
                        onChange={handleFileSelect}
                        className="hidden"
                        id={`file-upload-${documentType}`}
                        disabled={uploading}
                    />
                    
                    <label 
                        htmlFor={`file-upload-${documentType}`} 
                        className="cursor-pointer flex flex-col items-center gap-3"
                    >
                        {uploading ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Uploading...</span>
                            </div>
                        ) : (
                            <>
                                <Plus className="w-8 h-8 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max {maxSize}</p>
                                </div>
                            </>
                        )}
                    </label>
                </div>
            ) : (
                /* File Preview */
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isImage(file.fileName) ? (
                                <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded overflow-hidden">
                                    <img
                                        src={file.s3Url}
                                        alt={file.fileName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded flex items-center justify-center">
                                    <File className="w-5 h-5 text-gray-500" />
                                </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {file.fileName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(file.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href={file.s3Url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-500 text-sm"
                            >
                                View
                            </a>
                            
                            <button
                                onClick={handleFileDelete}
                                className="text-red-600 hover:text-red-500 p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload;