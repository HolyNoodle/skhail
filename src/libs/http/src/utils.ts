export const WebSocketGetter = () => {
  if (globalThis.WebSocket) {
    return globalThis.WebSocket;
  } else {
    return eval('require("ws")').WebSocket;
  }
};
