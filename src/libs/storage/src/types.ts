import { WritableStream, ReadableStream } from "@skhail/stream-isomorphic";

export interface IFileSystem {
  createWriteStream(
    path: string,
    start?: number,
    size?: number
  ): Promise<WritableStream<ArrayBuffer>>;
  createReadStream(
    path: string,
    start?: number
  ): Promise<ReadableStream<ArrayBuffer>>;
  list(path: string): Promise<string[]>;
  delete(path: string): Promise<void>;

  prepare?(): Promise<void>;
  cleanup?(): Promise<void>;
}

export interface StorageServiceOptions {
  fileSystem: IFileSystem;
}
