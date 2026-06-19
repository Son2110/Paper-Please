export const MAX_UPLOAD_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const UPLOAD_FILE_SIZE_NOTE = "Chỉ hỗ trợ file dưới 20 MB.";

export function isUploadFileSizeAllowed(file: File) {
  return file.size < MAX_UPLOAD_FILE_SIZE_BYTES;
}

export function getOversizedUploadFiles(files: File[]) {
  return files.filter((file) => !isUploadFileSizeAllowed(file));
}
