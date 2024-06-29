import WebSocket from "isomorphic-ws";
import { ReadableStream } from "@skhail/stream-isomorphic";

export class ReadableSocketStream {
  public bytesReceived = 0;
  public readonly readable: ReadableStream<ArrayBuffer>;

  constructor(socket: WebSocket) {
    this.readable = new ReadableStream({
      start: async (controller) => {
        this.bytesReceived = 0;

        socket.onerror = (err) => {
          controller.error(err);
        };
        socket.onclose = (ev) => {
          if (ev.code > 1005) {
            controller.error(ev.reason);
          } else {
            try {
              controller.close();
            } catch {}
          }
        };

        await new Promise<void>((resolve) => {
          if (socket.readyState === WebSocket.OPEN) {
            resolve();
            return;
          }

          socket.onopen = () => {
            resolve();
          };
        });
      },
      cancel(reason) {
        socket.close(3000, reason);
      },
      pull: (controller) => {
        // Wait for data
        return new Promise<void>((resolve, reject) => {
          socket.onmessage = (message) => {
            if (!message || !message.data) {
              return;
            }

            const data = message.data as any as ArrayBuffer;
            controller.enqueue(data);
            this.bytesReceived += data.byteLength;

            resolve();
          };

          if (socket.readyState !== WebSocket.OPEN) {
            resolve();
          }

          // Send a message to inform the other socket we want to pull data
          socket.send("", (err) => {
            if (err) {
              reject(err);
            }
          });
        });
      },
    });
  }
}
