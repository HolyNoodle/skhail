# @skhail/monitoring

This library is the core of the skhail library. It provides a logger that will connect to Loki in order to push logs directly into grafana.

It also provides helper config files:

- docker compose file as an example `docker-compose.int.yaml`
- grafana loki datasource provisionning files `src/libs/monitoring/config/datasources`
- grafana skhail dashboards provisionning files `src/libs/monitoring/config/dashboards`

## Getting started

(./docker-compose.int.yaml)[This file] offers an example of docker configuration in order to loki and grafana running.

Add the logger to your Skhail loggers:

```ts
const lokiLogger = new LokiLogger({
  app: "skhail-app", // main bucket value, your app name
  batchSize: 100, // how many logs can be sent in one batch
  sendBatchTime: 1000, // interval to wait between each batch sent
  url: "http://loki:3100", // root url of loki api
  env: "test", // environment bucket
  levels: [LogLevel.TRACE, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR], // what level to sent to loki
});
```

## Next steps

- promtail to monitor docker architecture + dashboards
