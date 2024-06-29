import { ConsoleLogger, LogLevel } from "@skhail/core";
import { AMQPConnection } from "../dist/classes/Connection";
import { AMQPQueue } from "../dist/classes/Queue";

const prepareTest = async () => {
  const connection = new AMQPConnection({
    hostname: "localhost",
    port: 5672,
  });

  await connection.prepare();

  return connection;
};

const start = async () => {
  const connection = await prepareTest();

  const queue = new AMQPQueue(connection);

  queue.setLogger(new ConsoleLogger([LogLevel.DEBUG, LogLevel.ERROR]));

  await queue.prepare();

  let y = 0;
  await queue.setHandler("Test", () => {
    console.log("Message received", y);

    y++;
    return Promise.resolve({} as any);
  });

  for (let i = 0; i < 100; i++) {
    console.log("Message", i);
    await queue.enqueue({
      service: "Test",
      method: "test",
      args: [],
      context: {
        tid: "test transaction id",
      },
    });
  }

  await queue.cleanup();
  await connection.cleanup();
};

start();
