/**
 * @group unit
 */
import { PromotheusClient } from "./PrometheusClient";
import * as http from "http";
import Prometheus from "prom-client";

jest.mock("http");
jest.mock("prom-client");

describe("PrometheusClient", () => {
  let server: any;
  let createServer: jest.SpyInstance;
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();

    server = {
      listen: jest.fn(),
      close: jest.fn(),
    };
    createServer = http.createServer as any as jest.SpyInstance;
    createServer.mockReturnValue(server);
  });

  it("Should instanciate prometheus dependency", () => {
    // Arrange
    // Act
    const instance = new PromotheusClient("test-app", "test-instance");

    // Assert
    expect(instance).toBeInstanceOf(PromotheusClient);
  });

  it("Should start http server on port 8080", async () => {
    // Arrange
    const client = new PromotheusClient("test-app", "test-instance");

    // Act
    const promise = client.prepare();
    server.listen.mock.calls[0][2]();
    await promise;

    // Assert
    expect(client["server"]).toBe(server);
    expect(createServer).toHaveBeenCalledTimes(1);
    expect(createServer).toHaveBeenCalledWith(expect.any(Function));

    expect(server.listen).toHaveBeenCalledTimes(1);
    expect(server.listen).toHaveBeenCalledWith(
      8080,
      "0.0.0.0",
      expect.any(Function)
    );
  });

  it("Should close http server", async () => {
    // Arrange
    const client = new PromotheusClient("test-app", "test-instance");
    client["server"] = server;

    // Act
    const promise = client.cleanup();
    server.close.mock.calls[0][0]();
    await promise;

    // Assert
    expect(server.close).toHaveBeenCalledTimes(1);
  });

  it("Should not close http server if not started", async () => {
    // Arrange
    const client = new PromotheusClient("test-app", "test-instance");

    // Act
    await client.cleanup();

    // Assert
    expect(server.close).not.toHaveBeenCalled();
  });

  it("Should respond to OPTIONS request", async () => {
    // Arrange
    const client = new PromotheusClient("test-app", "test-instance");
    const response = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    const request = {
      method: "OPTIONS",
    };
    client["server"] = server;

    // Act
    const promise = client.prepare();
    server.listen.mock.calls[0][2]();
    await promise;

    await createServer.mock.calls[0][0](request, response);

    // Assert
    expect(response.setHeader).toHaveBeenCalledTimes(3);
    expect(response.setHeader).toHaveBeenCalledWith(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, Origin, Context"
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    );

    expect(response.end).toHaveBeenCalledTimes(1);
  });

  it("Should return metrics", async () => {
    // Arrange
    const client = new PromotheusClient(
      "test-app",
      "test-instance",
      "test-env"
    );
    const response = {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };
    const request = {
      method: "GET",
    };
    const metrics = "metrics";
    client["server"] = server;
    const metricSpy = jest.fn().mockResolvedValue(metrics);
    const register = {
      metrics: metricSpy,
      setDefaultLabels: jest.fn(),
    };
    (Prometheus.Registry as any as jest.SpyInstance).mockReturnValue(register);

    // Act
    const promise = client.prepare();
    server.listen.mock.calls[0][2]();
    await promise;

    await createServer.mock.calls[0][0](request, response);

    // Assert
    expect(register.setDefaultLabels).toHaveBeenCalledTimes(1);
    expect(register.setDefaultLabels).toHaveBeenCalledWith({
      app: "test-app",
      env: "test-env",
      instance: "test-instance",
    });

    expect(Prometheus.collectDefaultMetrics).toHaveBeenCalledTimes(1);
    expect(Prometheus.collectDefaultMetrics).toHaveBeenCalledWith({
      register,
    });

    expect(response.setHeader).toHaveBeenCalledTimes(1);
    expect(response.setHeader).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "null"
    );

    expect(response.writeHead).toHaveBeenCalledTimes(1);
    expect(response.writeHead).toHaveBeenCalledWith(200);

    expect(response.write).toHaveBeenCalledTimes(1);
    expect(response.write).toHaveBeenCalledWith(metrics);

    expect(response.end).toHaveBeenCalledTimes(1);
  });
});
