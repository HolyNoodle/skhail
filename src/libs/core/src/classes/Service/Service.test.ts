/**
 * @group unit
 */
import { EventOptions } from "../../types";
import { SkhailService } from "./Service";

interface AppContext {
  contextProperty: string;
}

interface ServiceEvent extends EventOptions {
  eventName: [string];
}

class TestService extends SkhailService<AppContext, ServiceEvent> {
  static identifier = "Test";
}
class FailTestService extends SkhailService<AppContext, ServiceEvent> {}

describe("Service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Should instantiate service", () => {
    const service = new TestService();

    expect(service).toBeInstanceOf(SkhailService);
    expect(service).toBeInstanceOf(TestService);
  });

  it("Should not instantiate service", () => {
    expect(() => new FailTestService()).toThrow(
      "SkhailService needs to implement static property 'identifier'."
    );
  });

  describe("setNetwork", () => {
    it("Should set network", () => {
      const service = new TestService();
      const network = {} as any;

      service.setNetwork(network);

      expect(service["network"]).toBe(network);
    });
  });

  describe("setLogger", () => {
    it("Should set logger", () => {
      const service = new TestService();
      const logger = {} as any;

      service.setLogger(logger);

      expect(service["logger"]).toBe(logger);
    });
  });

  describe("getLogger", () => {
    it("Should set logger", () => {
      const service = new TestService();
      const logger = {} as any;

      service.setLogger(logger);

      const loggerObject = service.getLogger();

      expect(loggerObject).toBe(logger);
    });
  });

  describe("get", () => {
    it("Should call client get", () => {
      const service = new TestService();
      const expectedResult = { prop: "service" };
      const network = { get: jest.fn().mockReturnValue(expectedResult) } as any;

      service.setNetwork(network);

      const result = service.get(TestService, "1" as any);

      expect(result).toBe(expectedResult);
      expect(network.get).toHaveBeenCalledTimes(1);
      expect(network.get).toHaveBeenCalledWith(TestService, "1");
    });
    it("Should call client get without contexts", () => {
      const service = new TestService();
      const expectedResult = { prop: "service" };
      const network = { get: jest.fn().mockReturnValue(expectedResult) } as any;

      service.setNetwork(network);

      const result = service.get(TestService);

      expect(result).toBe(expectedResult);
      expect(network.get).toHaveBeenCalledTimes(1);
      expect(network.get).toHaveBeenCalledWith(TestService, undefined);
    });
  });
});
