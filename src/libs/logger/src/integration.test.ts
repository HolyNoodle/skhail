/**
 * @group integration
 */

import { InMemoryQueue, SkhailServer, SkhailService } from "@skhail/core";
import winston, { createLogger } from "winston";
import { WinstonLogger } from "./WinstonLogger";

const logFunction = jest.fn(console.log);

const winstonLogger = createLogger({
  levels: winston.config.syslog.levels,
  level: "debug",
  transports: [
    new winston.transports.Console({
      log(info, callback) {
        logFunction(info);
        callback();
      },
    }),
  ],
});

class FakeService extends SkhailService {
  static identifier: string = "FakeService";

  constructor() {
    super();
  }

  public async start(): Promise<boolean> {
    this.logger.warning("This is my log");

    return true;
  }
}

describe("WinstonLogger", () => {
  let server: SkhailServer;
  beforeAll(async () => {
    server = new SkhailServer({
      logger: new WinstonLogger(winstonLogger),
      services: [new FakeService()],
      queue: new InMemoryQueue(),
    });

    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it("Should log message to winston logger", async () => {
    // Arrange
    // Act
    const result = await server.get(FakeService).start();

    // Assert
    expect(result).toBe(true);
    expect(logFunction.mock.calls[3][0]).toMatchObject({
      level: "warning",
      message: expect.stringContaining("This is my log"),
    });
  });
});
