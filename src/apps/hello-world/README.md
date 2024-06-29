# @skhail/core

This library is the core of the skhail library.

# Skhail

Skhail is a way to build application and scale it easily. It provides the basis for any application to be built as a monolith and switch to a micro service architecture with little changes to the code base.

# Get ready to contribute

First, install dependencies

```
yarn install
```

Second, ... nothing, you are good to go !

# Ideology

Skhail is a developper friendly library. It uses typescript to enhance the experience of the developper while providing robust architecture.

Everything should be simple

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

That's it. You have you first service

## Server

The skhail server is the instance that will hold the service and connect them together through a queue and an event system.

To create a server:

```typescript
import {SkhailServer, ConsoleLogger, LogLevel, InMemoryQueue, InMemoryEventEmitter} from '@skhail/core':
import {TodoList} from './classes':

const server = new SkhailServer({
    services: [new Todolist()],
    logger: new ConsoleLogger(LogLevel.ERROR),
    queue: new InMemoryQueue(),
    event: new InMemoryEventEmitter(),
});

server.start().then(async () => {
    console.log("Server started");

    await server.stop();

    console.log("Server stopped");
});
```

With this code, the server will start all required resources for the services and setup the communication channels.

**Note**: the event property is optional and can be omitted if you don't want to have an event system.

## Calling a service

Since you now have a server running a service, it would be interesting to call this service

```typescript
server.start().then(async () => {
  console.log("Server started");

  await server.get(TodoList).add("my first todo list item");
  await server.get(TodoList).add("my second todo list item");
  await server.get(TodoList).remove("my first todo list item");
});
```

The server will send a message in the `queue`. The queue will find an instance of the requested service and call the method on this instance. As a monolith, there is only one instance of each service, but in a micro service architecture, multiple instances can be available at once. Only one instance has to be called when calling a method once.
