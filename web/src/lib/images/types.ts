export type LibraryImage = {
  id: string;
  name: string;
  createdAt: number;
  url: string;
  path: string;
};

export type ImageDownload = {
  blob: Blob;
  filename: string;
};

export interface ImageRepository {
  list(): Promise<LibraryImage[]>;
  upload(files: File[]): Promise<LibraryImage[]>;
  download(id: string): Promise<ImageDownload>;
  remove(id: string): Promise<LibraryImage[]>;
}
