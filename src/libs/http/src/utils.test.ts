/**
 * @group unit
 */
import { WebSocketGetter } from "./utils";

describe("WebSocketGetter", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    globalThis["WebSocket"] = undefined as any;
  });

  it("Should return global websocket", () => {
    globalThis["WebSocket"] = {} as any;
    const SocketClass = WebSocketGetter();

    expect(SocketClass).toBe(globalThis["WebSocket"]);
  });

  it("Should return ws websocket", () => {
    const MockedClass = { WebSocket: { string: "test string" } };

    global.eval = jest.fn().mockReturnValue(MockedClass);
    const SocketClass = WebSocketGetter();

    expect(SocketClass).toStrictEqual(MockedClass.WebSocket);
    expect(global.eval).toHaveBeenCalledTimes(1);
    expect(global.eval).toHaveBeenCalledWith('require("ws")');
  });
});
