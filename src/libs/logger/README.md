# @skhail/core

This library is the core of the skhail library.

# Skhail

Skhail is a way to build application and scale it easily. It provides the basis for any application to be built as a monolith and switch to a flexible architecture with little changes to the code base.

# Get ready to contribute

Install dependencies and build the libraries and examples

```
yarn install
yarn build
```

You are good to go !

# Ideology

Skhail is a developper friendly library. It uses typescript to enhance the experience of the developper while providing robust architecture.

Everything should be simple. At least that's how I intended it.

# Architecture

Behind the scene, Skhail relies on a worker/job queue. In monolith this queue is a simple map of the services to call. In decentralized architecture, it get more complex. RabbitMQ is an example of a worker queue provider. This `queue` is the **spine** of the architecture. It is important that it is stays **healthy** and **monitored** at all time.

All server instances will connect to the queue provider and connect their service to a service queue (the service identifier). So it provides a way to get called and call others.

# Libs

We are currently in the `@skhail/core` folder. This is intended to be the root of everything. The system is built so we can provide quick helpers for most of your purpose.

Originally designed using class inheritance in order to apply new feature easily by inheriting a service, it has been deprecated. This is mainly because JS does not provide a convenient way to extends multiple classes and mixins are not very friendly from my point of view (opiniated choice). So, the libraries will come with different kind of implementations.

The libs will come with various improvements. For example:

- `@skhail/http` will help you expose your services using an Open API format. It'll also provide a client to consume it.
- `@skhail/auth` will help you have an authentication system to protect your services.

## Service

A service is class that will receive requests. This is how you declare a basic service:

```typescript
import {SkhailService} from '@skhail/core':

class TodoList extends SkhailService {
    async add(item: string) {
        console.log("add", item);
    }

    async remove(item: string) {
        console.log("remove", item);
    }
}
```

Asynchronous behaviour is at the core of Skhail. Only methods returning a promise will be callable. The methods `add` and `remove` are available.

That's it. You have your first service

## Server

The skhail server is the instance that will hold the service and connect them together through a queue and an event system.

The `NodeProcess` is a helper to help you kickstart your server:

```typescript
import { NodeProcess } from "@skhail/core";
import { TodoList } from './classes':

const serverProcess = new NodeProcess(process, [new TodoList()]);

await serverProcess.start();
console.log("Server started");

await serverProcess.stop();
console.log("Server stopped");
```

With this code, the server will start all required resources for the services and setup the communication channels.

## Calling a service

Since you now have a server running a service, it would be interesting to call this service

```typescript
// ... server has been started
const server = serverProcess.getServer();

await server.get(TodoList).add("my first todo list item");
await server.get(TodoList).add("my second todo list item");
await server.get(TodoList).remove({ id: 1 });
```

The server will send a message in the `queue`. The queue will find an instance of the requested service and call the method on this instance. As a monolith, there is only one instance of each service, but in a micro service architecture, multiple instances can be available at once. Only one instance has to be called when calling a method once.

# Example

The `src/apps/hello-world` folder is an example of what this document is about.

Other folder in this the `src/apps` will present a deeper point of view of the libraries.
