# Skhail

Skhail is an open source library aimed to create isolated and scalable services in TS (and JS). The core principle allowing the system to scale is the "queue".

# Documentation

This document is about a getting started. For more information check the wiki: https://github.com/HolyNoodle/skhail/wiki

# Getting Started

Let's discuss the context of a TodoList app

## Installation

TODO: go for package management

For the moment, use the github url

## Project architecture

A monorepository is recommended for the ease of sharing different modules. We'll start with a monolith

A project tree could be:

- shared: Will hold the shared code, notable the abstract classes (referenced as interfaces), types, utils...
  - services
    - TodoList.ts
  - types.ts
- app: Will hold the client
- core: Will hold the server
  - services
    - TodoList.ts
  - server.ts

## Service

### Core

A service represent whatever logic you want to host.

Here is the basic TodoList CRUD structure. Something basic.

```js
// File: core/services/TodoList.Ts
import { ITodoListService, TodoItem, WithId } from "shared";

export class TodoListService extends ITodoListService {
  list(): Promise<TodoItem[]> {
    // ...
  }
  get(id: string): Promise<TodoItem> {
    // ...
  }
  create(todoItem: TodoItem): Promise<WithId<TodoItem>> {
    // ...
  }
  update(todoItem: WithId<TodoItem>): Promise<WithId<TodoItem>> {
    // ...
  }
  delete(id: string): Promise<void> {
    // ...
  }
}
```

There are a few things we should explain but we'll see that later in this document.

### Shared

Let's discuss the `extends ITodoListService` part of the above code.

This is the shared interface for others service or the apps to call this service.

```js
// File: shared/services/TodoList.Ts
import { SkhailService } from "@skhail/core";

import { TodoItem, WithId } from "../types";

export class ITodoListService extends SkhailService {
  static identifier = "TodoListService";

  abstract list(): Promise<TodoItem[]>;
  abstract get(id: string): Promise<TodoItem>;
  abstract create(todoItem: TodoItem): Promise<WithId<TodoItem>>;
  abstract update(todoItem: WithId<TodoItem>): Promise<WithId<TodoItem>>;
  abstract delete(id: string): Promise<void>;
}
```

We define the structure of the service.

### Server

You must wonder how can we use that? Let's create a server

```js
// File: core/server.ts
import { NodeProcess } from "@skhail/core";

import { TodoListService } from "core";

const main = async () => {
  const serverProcess = new NodeProcess(process, [new TodoListService()]);

  await serverProcess.start();
};

main();
```

Our server is ready but it's a bit useless as it is.

### Exposing our backend

Let's update our server to

Let's update our TodoList service to expose

```js
// File: core/services/TodoList.Ts
import { Expose, ExposeMethod } from "@skhail/http/dist/server";

import { ITodoListService, TodoItem, WithId } from "shared";

@Expose("todo")
export class TodoListService extends ITodoListService {
  @ExposeMethod()
  list(): Promise<TodoItem[]> {
    // ...
  }
  @ExposeMethod({ path: "{id}", parameters: [{ name: "id" }] })
  get(id: string): Promise<TodoItem> {
    // ...
  }
  @ExposeMethod({ mode: "post" })
  create(todoItem: TodoItem): Promise<WithId<TodoItem>> {
    // ...
  }
  @ExposeMethod({ path: "{id}", parameters: [{ name: "id" }], mode: "put" })
  update(todoItem: WithId<TodoItem>): Promise<WithId<TodoItem>> {
    // ...
  }
  @ExposeMethod({ path: "{id}", parameters: [{ name: "id" }], mode: "delete" })
  delete({ id }: WithId<TodoItem>): Promise<void> {
    // ...
  }
}
```

We should update the `ITodoListService` also to match this change.
And we should add the `APIService` to the server.

```js
// File: core/server.ts
import { NodeProcess } from "@skhail/core";
import { APIService } from "@skhail/http/dist/server";

import { TodoListService } from "core";

const main = async () => {
  const serverProcess = new NodeProcess(process, [
    new APIService(),
    new TodoListService(),
  ]);

  await serverProcess.start();
};

main();
```

The api service will expose the server on the port `5000`.

### App

Let's add a front end app. Use whatever stack you want and host it in the `app` folder.

add a util file somewhere to create a skhail client

```js
import { HTTPInterface } from "@skhail/http";

export const initClient = async () => {
  const client = new HTTPInterface();

  await client.start();

  return client;
};
```

Then use it

```js
import { ITodoListService } from "shared";

const allTodos = await client.get(ITodoListService).list();

const createdTodoItem = await client
  .get(ITodoListService)
  .create({ todo: "Something to do", done: false });

const updatedTodoItem = await client
  .get(ITodoListService)
  .create({ ...createdTodoList, done: true });

await client.get(ITodoListService).delete(updatedTodoItem);
```

We are done.

# Publishing packages

Second action will pop up a login scenario

```
source .env
yarn release:prepare
yarn release
```
