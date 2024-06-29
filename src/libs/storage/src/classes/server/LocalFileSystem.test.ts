/**
 * @group unit
 */
import exp from "constants";
import { LocalFileSystem } from "./LocalFileSystem";
import * as fs from "fs";

jest.mock("fs");

describe("LocalFileSystem", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it("Should instantiate LocalFileSystem", () => {
    const localStorage = new LocalFileSystem("./tmp");

    expect(localStorage).toBeInstanceOf(LocalFileSystem);
  });

  describe("list", () => {
    it("Should call fs readdir and return files", async () => {
      const files = ["file1", "file2"];
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(true);
      const readdir = jest
        .spyOn(fs, "readdir")
        .mockImplementation((_, cb: any) => cb(undefined, files));
      const localStorage = new LocalFileSystem("./tmp");

      const result = await localStorage.list("test path");

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(readdir).toHaveBeenCalledTimes(1);
      expect(readdir.mock.calls[0][0]).toBe("./tmp/test path");

      expect(result).toStrictEqual(["test path/file1", "test path/file2"]);
    });

    it("Should throw when read dir fails", async () => {
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(true);
      const readdir = jest
        .spyOn(fs, "readdir")
        .mockImplementation((_, cb: any) => cb("test error"));
      const localStorage = new LocalFileSystem("./tmp");

      let error;
      try {
        await localStorage.list("test path");
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.toObject()).toStrictEqual({
        name: "unexpected",
        details: {},
        message: "test error",
        name: "unexpected",
      });

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(readdir).toHaveBeenCalledTimes(1);
      expect(readdir.mock.calls[0][0]).toBe("./tmp/test path");
    });

    it("Should throw with overriden path when read dir fails and path is present in the error", async () => {
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(true);
      const readdir = jest
        .spyOn(fs, "readdir")
        .mockImplementation((_, cb: any) =>
          cb({
            message: "test error",
            path: "i am path",
          } as NodeJS.ErrnoException)
        );
      const localStorage = new LocalFileSystem("./tmp");

      let error;
      try {
        await localStorage.list("test path");
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.toObject()).toStrictEqual({
        name: "unexpected",
        details: {
          error: {
            message: "test error",
            path: "test path",
          },
        },
        message: "An unexpected error occured",
        name: "unexpected",
      });

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(readdir).toHaveBeenCalledTimes(1);
      expect(readdir.mock.calls[0][0]).toBe("./tmp/test path");
    });

    it("Should throw when folder does not exist", async () => {
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(false);
      const readdir = jest.spyOn(fs, "readdir");
      const localStorage = new LocalFileSystem("./tmp");

      await expect(localStorage.list("test path")).rejects.toThrow(
        "Path does not exist"
      );

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(readdir).toHaveBeenCalledTimes(0);
    });
  });

  describe("delete", () => {
    it("Should call fs rm", async () => {
      const rm = jest
        .spyOn(fs, "rm")
        .mockImplementation((_, cb: any) => cb(undefined));
      const localStorage = new LocalFileSystem("./tmp");

      await localStorage.delete("test path");

      expect(rm).toHaveBeenCalledTimes(1);
      expect(rm.mock.calls[0][0]).toBe("./tmp/test path");
    });

    it("Should throw when rm fails", async () => {
      const rm = jest
        .spyOn(fs, "rm")
        .mockImplementation((_, cb: any) => cb("test error"));
      const localStorage = new LocalFileSystem("./tmp");

      await expect(localStorage.delete("test path")).rejects.toThrow();

      expect(rm).toHaveBeenCalledTimes(1);
      expect(rm.mock.calls[0][0]).toBe("./tmp/test path");
    });
  });

  describe("createReadStream", () => {
    it("Should call fs createReadStream", async () => {
      const stream = {
        on: jest.fn(),
        once: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
      };
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(true);
      const createReadStream = jest
        .spyOn(fs, "createReadStream")
        .mockReturnValue(stream as any);
      const localStorage = new LocalFileSystem("./tmp");

      const readStreamPromise = localStorage.createReadStream("test path");

      expect(stream.pause).toHaveBeenCalledTimes(1);
      expect(stream.pause).toHaveBeenCalledWith();

      expect(stream.once).toHaveBeenCalledTimes(1);
      expect(stream.once).toHaveBeenCalledWith("ready", expect.any(Function));

      stream.once.mock.calls[0][1]();

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(createReadStream).toHaveBeenCalledTimes(1);
      expect(createReadStream).toHaveBeenCalledWith("./tmp/test path", {
        start: 0,
        highWaterMark: 10485760,
      });

      const readStream = await readStreamPromise;
      const reader = readStream.getReader();

      const readPromise = reader.read();

      expect(stream.on).toHaveBeenCalledTimes(2);
      expect(stream.on.mock.calls[0][0]).toBe("end");
      expect(stream.on.mock.calls[1][0]).toBe("error");

      const data = Buffer.from("content");

      expect(stream.once).toHaveBeenCalledTimes(2);
      expect(stream.once).toHaveBeenCalledWith("data", expect.any(Function));

      stream.once.mock.calls[1][1](data);

      const { value, done } = await readPromise;

      expect(value).toBe(data);
      expect(done).toBeFalsy();
    });

    it("Should call fs createReadStream starting at 10", async () => {
      const stream = { on: jest.fn(), once: jest.fn(), pause: jest.fn() };
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(true);
      const createReadStream = jest
        .spyOn(fs, "createReadStream")
        .mockReturnValue(stream as any);
      const localStorage = new LocalFileSystem("./tmp");

      localStorage.createReadStream("test path", 10);

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(createReadStream).toHaveBeenCalledTimes(1);
      expect(createReadStream).toHaveBeenCalledWith("./tmp/test path", {
        start: 10,
        highWaterMark: 10485760,
      });
    });

    it("Should throw when folder does not exist", async () => {
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(false);
      const createReadStream = jest
        .spyOn(fs, "createReadStream")
        .mockReturnValue({} as any);
      const localStorage = new LocalFileSystem("./tmp");

      await expect(localStorage.createReadStream("test path")).rejects.toThrow(
        "File does not exist"
      );

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(createReadStream).toHaveBeenCalledTimes(0);
    });

    it("Should close stream on end", async () => {
      const stream = {
        on: jest.fn(),
        once: jest.fn(),
        pause: jest.fn(),
        close: jest.fn(),
      };
      jest.spyOn(fs, "existsSync").mockReturnValue(true);
      jest.spyOn(fs, "createReadStream").mockReturnValue(stream as any);

      const localStorage = new LocalFileSystem("./tmp");

      const promise = localStorage.createReadStream("test path");

      stream.once.mock.calls[0][1]();

      await promise;

      stream.on.mock.calls[0][1]();

      expect(stream.close).toHaveBeenCalledTimes(1);
      expect(stream.close).toHaveBeenCalledWith(expect.any(Function));

      const closeCb = stream.close.mock.calls[0][0];

      // TODO: What to test on that as I don't have access to the internal controller?
      closeCb();
      closeCb("error");
    });

    it("Should set the end index on file system stream when size is given", async () => {
      const stream = {
        on: jest.fn(),
        once: jest.fn(),
        pause: jest.fn(),
        close: jest.fn(),
      };
      jest.spyOn(fs, "existsSync").mockReturnValue(true);
      jest.spyOn(fs, "createReadStream").mockReturnValue(stream as any);

      const localStorage = new LocalFileSystem("./tmp");

      const promise = localStorage.createReadStream("test path", 0, 10);

      stream.once.mock.calls[0][1]();

      await promise;

      expect(fs.createReadStream).toHaveBeenCalledTimes(1);
      expect(fs.createReadStream).toHaveBeenCalledWith("./tmp/test path", {
        start: 0,
        highWaterMark: 10485760,
        end: 10,
      });
    });
  });

  describe("createWriteStream", () => {
    it("Should call fs createWriteStream", async () => {
      const stream = {
        on: jest.fn(),
        write: jest.fn().mockReturnValue(true),
        close: jest.fn((cb) => cb()),
        once: jest.fn(),
      };
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(true);
      const createWriteStream = jest
        .spyOn(fs, "createWriteStream")
        .mockReturnValue(stream as any);
      const localStorage = new LocalFileSystem("./tmp");

      const resultStreamPromise = localStorage.createWriteStream("test path");

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(createWriteStream).toHaveBeenCalledTimes(1);
      expect(createWriteStream).toHaveBeenCalledWith("./tmp/test path", {
        start: 0,
      });

      expect(stream.once).toHaveBeenCalledTimes(1);
      expect(stream.once).toHaveBeenCalledWith("ready", expect.any(Function));

      stream.once.mock.calls[0][1]();

      const resultStream = await resultStreamPromise;
      const writer = resultStream.getWriter();

      const writePromise = writer.write(Buffer.from("content"));

      await writePromise;
      await writer.close();

      expect(stream.write).toHaveBeenCalledTimes(1);
      expect(stream.write).toHaveBeenCalledWith(Buffer.from("content"));

      expect(stream.close).toHaveBeenCalledTimes(1);
      expect(stream.close).toHaveBeenCalledWith(expect.any(Function));
    });

    it("Should call fs createWriteStream with back pressure", async () => {
      const stream = {
        on: jest.fn(),
        write: jest.fn().mockReturnValue(false),
        close: jest.fn().mockImplementation((cb) => cb()),
        once: jest.fn().mockImplementation((_, cb) => cb()),
      };
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(true);
      const createWriteStream = jest
        .spyOn(fs, "createWriteStream")
        .mockReturnValue(stream as any);
      const localStorage = new LocalFileSystem("./tmp");

      const resultStream = await localStorage.createWriteStream("test path");

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(createWriteStream).toHaveBeenCalledTimes(1);
      expect(createWriteStream).toHaveBeenCalledWith("./tmp/test path", {
        start: 0,
      });

      const writer = resultStream.getWriter();

      await writer.write(Buffer.from("content"));
      await writer.close();

      expect(stream.once).toHaveBeenCalledTimes(2);
      expect(stream.once).toHaveBeenNthCalledWith(
        2,
        "drain",
        expect.any(Function)
      );

      expect(stream.write).toHaveBeenCalledTimes(1);
      expect(stream.write).toHaveBeenCalledWith(Buffer.from("content"));

      expect(stream.close).toHaveBeenCalledTimes(1);
      expect(stream.close).toHaveBeenCalledWith(expect.any(Function));
    });

    it("Should call fs createWriteStream starting at 10", async () => {
      const stream = { on: jest.fn(), once: jest.fn(), pause: jest.fn() };
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(true);
      const createWriteStream = jest
        .spyOn(fs, "createWriteStream")
        .mockReturnValue(stream as any);
      const localStorage = new LocalFileSystem("./tmp");

      await localStorage.createWriteStream("test path", 10);

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(createWriteStream).toHaveBeenCalledTimes(1);
      expect(createWriteStream).toHaveBeenCalledWith("./tmp/test path", {
        start: 10,
      });
    });

    it("Should call fs create file when path does not exists", async () => {
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(false);
      const writeFileSync = jest.spyOn(fs, "writeFileSync");
      const createWriteStream = jest
        .spyOn(fs, "createWriteStream")
        .mockReturnValue({ on: jest.fn() } as any);
      const localStorage = new LocalFileSystem("./tmp");

      await localStorage.createWriteStream("test path");

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(writeFileSync).toHaveBeenCalledTimes(1);
      expect(writeFileSync).toHaveBeenCalledWith(
        "./tmp/test path",
        Buffer.from("")
      );

      expect(createWriteStream).toHaveBeenCalledTimes(1);
      expect(createWriteStream).toHaveBeenCalledWith("./tmp/test path", {
        start: 0,
      });
    });
    it("Should destroy stream when aborting", async () => {
      const stream = {
        on: jest.fn(),
        write: jest.fn().mockReturnValue(true),
        close: jest.fn((cb) => cb()),
        once: jest.fn(),
        destroy: jest.fn(),
      };
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(true);
      const createWriteStream = jest
        .spyOn(fs, "createWriteStream")
        .mockReturnValue(stream as any);
      const localStorage = new LocalFileSystem("./tmp");

      const resultStreamPromise = localStorage.createWriteStream("test path");

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp/test path");

      expect(createWriteStream).toHaveBeenCalledTimes(1);
      expect(createWriteStream).toHaveBeenCalledWith("./tmp/test path", {
        start: 0,
      });

      expect(stream.once).toHaveBeenCalledTimes(1);
      expect(stream.once).toHaveBeenCalledWith("ready", expect.any(Function));

      stream.once.mock.calls[0][1]();

      const resultStream = await resultStreamPromise;
      const writer = resultStream.getWriter();

      const writePromise = writer.write(Buffer.from("content"));

      await writePromise;
      await writer.abort();

      expect(stream.write).toHaveBeenCalledTimes(1);
      expect(stream.write).toHaveBeenCalledWith(Buffer.from("content"));

      expect(stream.destroy).toHaveBeenCalledTimes(1);
    });
  });
  describe("prepare", () => {
    it("Should call create base folder when it does not exists", async () => {
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(false);
      const mkdirSync = jest
        .spyOn(fs, "mkdirSync")
        .mockImplementation(() => null as any);
      const localStorage = new LocalFileSystem("./tmp");

      await localStorage.prepare();

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp");

      expect(mkdirSync).toHaveBeenCalledTimes(1);
      expect(mkdirSync).toHaveBeenCalledWith("./tmp");
    });

    it("Should not call create base folder when it already exists", async () => {
      const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(true);
      const mkdirSync = jest.spyOn(fs, "mkdirSync");
      const localStorage = new LocalFileSystem("./tmp");

      await localStorage.prepare();

      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(existsSync).toHaveBeenCalledWith("./tmp");

      expect(mkdirSync).toHaveBeenCalledTimes(0);
    });
  });
});
