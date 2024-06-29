import { IFileSystem } from "../../types";
import * as fs from "fs";
import * as stream from "@skhail/stream-isomorphic";
import * as pathUtils from "path";
import { getError, SkhailError } from "@skhail/core";

export class LocalFileSystem implements IFileSystem {
  constructor(private root: string) {}

  prepare(): Promise<void> {
    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root);
    }

    return Promise.resolve();
  }

  private getPath(path: string) {
    return "./" + pathUtils.join(this.root, path);
  }
  private createPath(path: string) {
    const pathArray = path.split("/");
    const folders = pathArray.slice(0, pathArray.length - 1);

    fs.mkdirSync(this.getPath(pathUtils.join(...folders)), { recursive: true });
  }
  async createWriteStream(
    path: string,
    start = 0
  ): Promise<stream.WritableStream<ArrayBuffer>> {
    this.createPath(path);

    if (!fs.existsSync(this.getPath(path))) {
      fs.writeFileSync(this.getPath(path), Buffer.from(""));
    }

    const startIndex = start;
    const fStream = fs.createWriteStream(this.getPath(path), {
      start: startIndex,
    });

    return new stream.WritableStream<ArrayBuffer>({
      start: (controller) => {
        fStream.on("error", (err) => {
          controller.error(err);
        });

        return new Promise<void>((resolve) => {
          fStream.once("ready", () => {
            resolve();
          });
        });
      },
      write: (chunk) => {
        if (!fStream.write(chunk)) {
          return new Promise<void>((resolve) => {
            fStream.once("drain", () => {
              resolve();
            });
          });
        }
      },
      abort(reason) {
        fStream.destroy(new Error(reason));
      },
      close: () => {
        return new Promise<void>((resolve, reject) => {
          fStream.close((err) => {
            if (err) {
              reject(err);

              return;
            }

            resolve();
          });
        });
      },
    });
  }
  async createReadStream(
    path: string,
    start: number = 0,
    size?: number
  ): Promise<stream.ReadableStream<ArrayBuffer>> {
    const fullPath = this.getPath(path);

    if (!fs.existsSync(fullPath)) {
      return Promise.reject(
        new SkhailError({
          name: "not_found",
          message: "File does not exist",
          details: {
            path,
          },
        })
      );
    }

    const startIndex = start;
    const endIndex = size ? startIndex + size : undefined;
    const fStream = fs.createReadStream(fullPath, {
      start,
      end: endIndex,
      highWaterMark: 10 * 1024 * 1024,
    });
    fStream.pause();

    await new Promise<void>((resolve) => {
      fStream.once("ready", () => {
        resolve();
      });
    });

    return new stream.ReadableStream<ArrayBuffer>({
      start: (controller) => {
        fStream.on("end", () => {
          fStream.close((err) => {
            if (err) {
              controller.error(err);
              return;
            }

            controller.close();
          });
        });

        fStream.on("error", (err) => {
          controller.error(err);
        });
      },
      cancel: () => {
        fStream.close();
      },
      pull: async (controller) => {
        fStream.resume();

        await new Promise<void>((resolve) => {
          fStream.once("data", (data) => {
            fStream.pause();

            controller.enqueue(data as any);
            resolve();
          });
        });
      },
    });
  }
  list(path: string): Promise<string[]> {
    const fullPath = this.getPath(path);

    if (!fs.existsSync(fullPath)) {
      return Promise.reject(
        new SkhailError({
          name: "not_found",
          message: "Path does not exist",
          details: {
            path,
          },
        })
      );
    }

    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(fullPath, (err, files) => {
        if (err) {
          if (err.path) {
            err.path = path;
          }

          reject(getError(err));
          return;
        }

        resolve(files.map((f) => pathUtils.join(path, f)));
      });
    });
  }
  delete(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.rm(this.getPath(path), (err) => {
        if (err) {
          reject(getError(err));
          return;
        }

        resolve();
      });
    });
  }
}
