import { Server, createServer } from "http";
import Prometheus from "prom-client";

import { ILifeCycle } from "@skhail/core";

export class PromotheusClient implements ILifeCycle {
  private server?: Server;

  constructor(
    private app: string,
    private instance: string,
    private env: string = process.env.NODE_ENV ?? "development"
  ) {}

  async prepare(): Promise<void> {
    const register = new Prometheus.Registry();

    register.setDefaultLabels({
      app: this.app,
      env: this.env,
      instance: this.instance,
    });

    Prometheus.collectDefaultMetrics({
      register,
    });

    this.server = createServer(async (request, response) => {
      response.setHeader("Access-Control-Allow-Origin", "null");

      if (request.method === "OPTIONS") {
        response.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Accept, Origin, Context"
        );
        response.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        );

        response.end();
        return;
      }
      response.writeHead(200);

      response.write(await register.metrics());

      response.end();
    });

    await new Promise((resolve) => {
      this.server!.listen(8080, "0.0.0.0", () => {
        resolve(undefined);
        console.log("Prometheus server started on port 8080");
      });
    });
  }

  cleanup(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        console.log("Prometheus server closing");
        this.server!.close(() => {
          console.log("Prometheus server closed");
          resolve();
        });

        return;
      }

      resolve();
    });
  }
}
