import WebSocket from "isomorphic-ws";
import { WritableStream } from "@skhail/stream-isomorphic";

export class WritableSocketStream {
  public bytesSent = 0;
  public readonly writable: WritableStream<ArrayBuffer>;
  private initPulled = false;

  constructor(socket: WebSocket) {
    this.writable = new WritableStream<ArrayBuffer>({
      start: async (controller) => {
        this.bytesSent = 0;

        socket.onerror = (err) => {
          controller.error(err);
        };
        socket.onclose = (ev) => {
          if (ev.code > 1005) {
            controller.error(ev.reason);
          }
        };
        socket.onmessage = () => {
          this.initPulled = true;
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
      abort(reason) {
        socket.close(3000, reason);
      },
      close: () => {
        socket.close(1000);
      },
      write: async (chunk) => {
        const sendData = () => {
          if (socket.readyState !== WebSocket.OPEN) {
            return Promise.reject(new Error("Socket is not in open state"));
          }

          socket.send(chunk);
          this.bytesSent += chunk.byteLength;

          return Promise.resolve();
        };

        if (this.initPulled) {
          await sendData();
          this.initPulled = false;
        } else {
          await new Promise<void>(async (resolve, reject) => {
            socket.onmessage = () => {
              sendData().then(resolve).catch(reject);
            };
          });
        }

        socket.onmessage = null;
      },
    });
  }
}
