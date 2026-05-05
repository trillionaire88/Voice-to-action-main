import { useState } from "react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, Image as ImageIcon, Video, FileText } from "lucide-react";
import { toast } from "sonner";

export default function MediaUploader({ onUploadComplete, maxFiles = 1, acceptedTypes = ["image", "video"] }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + uploadedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const { file_url } = await api.integrations.Core.UploadFile({ file });
          return {
            url: file_url,
            type: file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "document",
            name: file.name,
          };
        })
      );

      const newFiles = [...uploadedFiles, ...uploads];
      setUploadedFiles(newFiles);
      onUploadComplete(newFiles);
      toast.success("Files uploaded successfully");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onUploadComplete(newFiles);
  };

  const getAcceptString = () => {
    const types = [];
    if (acceptedTypes.includes("image")) types.push("image/*");
    if (acceptedTypes.includes("video")) types.push("video/*");
    if (acceptedTypes.includes("document")) types.push(".pdf,.doc,.docx,.txt");
    return types.join(",");
  };

  return (
    <div className="space-y-3">
      {uploadedFiles.length < maxFiles && (
        <label className="block">
          <input
            type="file"
            multiple={maxFiles > 1}
            accept={getAcceptString()}
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={(e) => e.currentTarget.previousElementSibling.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Media"}
          </Button>
        </label>
      )}

      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {uploadedFiles.map((file, index) => (
            <Card key={index} className="relative p-3">
              <button
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="flex items-center gap-2">
                {file.type === "image" && <ImageIcon className="w-4 h-4" />}
                {file.type === "video" && <Video className="w-4 h-4" />}
                {file.type === "document" && <FileText className="w-4 h-4" />}
                <span className="text-xs truncate">{file.name}</span>
              </div>
              {file.type === "image" && (
                <img src={file.url} alt="" className="mt-2 w-full h-20 object-cover rounded" />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}