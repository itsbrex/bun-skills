---
name: Bun Guides
description: Code samples and walkthroughs for common tasks with Bun
---

# Guides

> Code samples and walkthroughs for common tasks with Bun

Each guide below is also available as its own skill named `bun-<path with / replaced by ->` (for example `guides/http/simple` is `bun-guides-http-simple`).

## Deployment

- [Deploy a Bun application on Vercel](/guides/deployment/vercel)
- [Deploy a Bun application on Railway](/guides/deployment/railway)
- [Deploy a Bun application on Render](/guides/deployment/render)
- [Deploy a Bun application on AWS Lambda](/guides/deployment/aws-lambda)
- [Deploy a Bun application on DigitalOcean](/guides/deployment/digital-ocean)
- [Deploy a Bun application on Google Cloud Run](/guides/deployment/google-cloud-run)

## Binary data

- [Convert an ArrayBuffer to a string](/guides/binary/arraybuffer-to-string)
- [Convert an ArrayBuffer to a Buffer](/guides/binary/arraybuffer-to-buffer)
- [Convert an ArrayBuffer to a Blob](/guides/binary/arraybuffer-to-blob)
- [Convert an ArrayBuffer to an array of numbers](/guides/binary/arraybuffer-to-array)
- [Convert an ArrayBuffer to a Uint8Array](/guides/binary/arraybuffer-to-typedarray)
- [Convert a Buffer to a string](/guides/binary/buffer-to-string)
- [Convert a Buffer to an ArrayBuffer](/guides/binary/buffer-to-arraybuffer)
- [Convert a Buffer to a blob](/guides/binary/buffer-to-blob)
- [Convert a Buffer to a Uint8Array](/guides/binary/buffer-to-typedarray)
- [Convert a Buffer to a ReadableStream](/guides/binary/buffer-to-readablestream)
- [Convert a Blob to a string](/guides/binary/blob-to-string)
- [Convert a Blob to an ArrayBuffer](/guides/binary/blob-to-arraybuffer)
- [Convert a Blob to a Uint8Array](/guides/binary/blob-to-typedarray)
- [Convert a Blob to a DataView](/guides/binary/blob-to-dataview)
- [Convert a Blob to a ReadableStream](/guides/binary/blob-to-stream)
- [Convert a Uint8Array to a string](/guides/binary/typedarray-to-string)
- [Convert a Uint8Array to an ArrayBuffer](/guides/binary/typedarray-to-arraybuffer)
- [Convert a Uint8Array to a Buffer](/guides/binary/typedarray-to-buffer)
- [Convert a Uint8Array to a Blob](/guides/binary/typedarray-to-blob)
- [Convert a Uint8Array to a DataView](/guides/binary/typedarray-to-dataview)
- [Convert a Uint8Array to a ReadableStream](/guides/binary/typedarray-to-readablestream)
- [Convert a DataView to a string](/guides/binary/dataview-to-string)

## Ecosystem

- [Build an app with Astro and Bun](/guides/ecosystem/astro)
- [Create a Discord bot](/guides/ecosystem/discordjs)
- [Containerize a Bun application with Docker](/guides/ecosystem/docker)
- [Use Drizzle ORM with Bun](/guides/ecosystem/drizzle)
- [Use Gel with Bun](/guides/ecosystem/gel)
- [Build an HTTP server using Elysia and Bun](/guides/ecosystem/elysia)
- [Build an HTTP server using Express and Bun](/guides/ecosystem/express)
- [Build an HTTP server using Hono and Bun](/guides/ecosystem/hono)
- [Read and write data to MongoDB using Mongoose and Bun](/guides/ecosystem/mongoose)
- [Use Neon Postgres through Drizzle ORM](/guides/ecosystem/neon-drizzle)
- [Use Neon's Serverless Postgres with Bun](/guides/ecosystem/neon-serverless-postgres)
- [Build an app with Next.js and Bun](/guides/ecosystem/nextjs)
- [Build an app with Nuxt and Bun](/guides/ecosystem/nuxt)
- [Run Bun as a daemon with PM2](/guides/ecosystem/pm2)
- [Use Prisma with Bun](/guides/ecosystem/prisma)
- [Use Prisma Postgres with Bun](/guides/ecosystem/prisma-postgres)
- [Build an app with Qwik and Bun](/guides/ecosystem/qwik)
- [Build a React app with Bun](/guides/ecosystem/react)
- [Build an app with Remix and Bun](/guides/ecosystem/remix)
- [Use TanStack Start with Bun](/guides/ecosystem/tanstack-start)
- [Add Sentry to a Bun app](/guides/ecosystem/sentry)
- [Build an app with SolidStart and Bun](/guides/ecosystem/solidstart)
- [Server-side render (SSR) a React component](/guides/ecosystem/ssr-react)
- [Build an app with SvelteKit and Bun](/guides/ecosystem/sveltekit)
- [Run Bun as a daemon with systemd](/guides/ecosystem/systemd)
- [Build a frontend using Vite and Bun](/guides/ecosystem/vite)
- [Bun Redis with Upstash](/guides/ecosystem/upstash)

## HTMLRewriter

- [Extract links from a webpage using HTMLRewriter](/guides/html-rewriter/extract-links)
- [Extract social share images and Open Graph tags](/guides/html-rewriter/extract-social-meta)

## HTTP

- [Common HTTP server usage](/guides/http/server)
- [Write a simple HTTP server](/guides/http/simple)
- [Send an HTTP request using fetch](/guides/http/fetch)
- [Hot reload an HTTP server](/guides/http/hot)
- [Start a cluster of HTTP servers](/guides/http/cluster)
- [Configure TLS on an HTTP server](/guides/http/tls)
- [Proxy HTTP requests using fetch()](/guides/http/proxy)
- [Stream a file as an HTTP Response](/guides/http/stream-file)
- [Upload files via HTTP using FormData](/guides/http/file-uploads)
- [fetch with unix domain sockets in Bun](/guides/http/fetch-unix)
- [Streaming HTTP Server with Async Iterators](/guides/http/stream-iterator)
- [Server-Sent Events (SSE) with Bun](/guides/http/sse)
- [Streaming HTTP Server with Node.js Streams](/guides/http/stream-node-streams-in-bun)

## Package manager

- [Add a dependency](/guides/install/add)
- [Add a development dependency](/guides/install/add-dev)
- [Add an optional dependency](/guides/install/add-optional)
- [Add a peer dependency](/guides/install/add-peer)
- [Add a Git dependency](/guides/install/add-git)
- [Add a tarball dependency](/guides/install/add-tarball)
- [Install a package under a different name](/guides/install/npm-alias)
- [Configuring a monorepo using workspaces](/guides/install/workspaces)
- [Override the default npm registry for bun install](/guides/install/custom-registry)
- [Configure a private registry for an organization scope with bun install](/guides/install/registry-scope)
- [Using bun install with an Azure Artifacts npm registry](/guides/install/azure-artifacts)
- [Using bun install with Artifactory](/guides/install/jfrog-artifactory)
- [Add a trusted dependency](/guides/install/trusted)
- [Generate a yarn-compatible lockfile](/guides/install/yarnlock)
- [Migrate from npm install to bun install](/guides/install/from-npm-install-to-bun-install)
- [Configure git to diff Bun's lockb lockfile](/guides/install/git-diff-bun-lockfile)
- [Install dependencies with Bun in GitHub Actions](/guides/install/cicd)

## Processes

- [Spawn a child process](/guides/process/spawn)
- [Read stdout from a child process](/guides/process/spawn-stdout)
- [Read stderr from a child process](/guides/process/spawn-stderr)
- [Parse command-line arguments](/guides/process/argv)
- [Read from stdin](/guides/process/stdin)
- [Spawn a child process and communicate using IPC](/guides/process/ipc)
- [Listen for CTRL+C](/guides/process/ctrl-c)
- [Listen to OS signals](/guides/process/os-signals)
- [Get the process uptime in nanoseconds](/guides/process/nanoseconds)

## Reading files

- [Read a file as a string](/guides/read-file/string)
- [Read a file to a Buffer](/guides/read-file/buffer)
- [Read a file to a Uint8Array](/guides/read-file/uint8array)
- [Read a file to an ArrayBuffer](/guides/read-file/arraybuffer)
- [Read a JSON file](/guides/read-file/json)
- [Get the MIME type of a file](/guides/read-file/mime)
- [Check if a file exists](/guides/read-file/exists)
- [Watch a directory for changes](/guides/read-file/watch)
- [Read a file as a ReadableStream](/guides/read-file/stream)

## Runtime

- [Install TypeScript declarations for Bun](/guides/runtime/typescript)
- [Re-map import paths](/guides/runtime/tsconfig-paths)
- [Debugging Bun with the VS Code extension](/guides/runtime/vscode-debugger)
- [Debugging Bun with the web debugger](/guides/runtime/web-debugger)
- [Inspect memory usage using V8 heap snapshots](/guides/runtime/heap-snapshot)
- [Build-time constants with --define](/guides/runtime/build-time-constants)
- [Define and replace static globals & constants](/guides/runtime/define-constant)
- [Install and run Bun in GitHub Actions](/guides/runtime/cicd)
- [Codesign a single-file JavaScript executable on macOS](/guides/runtime/codesign-macos-executable)
- [Run a Shell Command](/guides/runtime/shell)
- [Set a time zone in Bun](/guides/runtime/timezone)
- [Set environment variables](/guides/runtime/set-env)
- [Read environment variables](/guides/runtime/read-env)
- [Import a JSON file](/guides/runtime/import-json)
- [Import a TOML file](/guides/runtime/import-toml)
- [Import a YAML file](/guides/runtime/import-yaml)
- [Import a JSON5 file](/guides/runtime/import-json5)
- [Import an XML file](/guides/runtime/import-xml)
- [Import a HTML file as text](/guides/runtime/import-html)
- [Delete files](/guides/runtime/delete-file)
- [Delete directories](/guides/runtime/delete-directory)

## Streams

- [Convert a ReadableStream to a string](/guides/streams/to-string)
- [Convert a ReadableStream to JSON](/guides/streams/to-json)
- [Convert a ReadableStream to a Blob](/guides/streams/to-blob)
- [Convert a ReadableStream to a Buffer](/guides/streams/to-buffer)
- [Convert a ReadableStream to an ArrayBuffer](/guides/streams/to-arraybuffer)
- [Convert a ReadableStream to a Uint8Array](/guides/streams/to-typedarray)
- [Convert a ReadableStream to an array of chunks](/guides/streams/to-array)
- [Convert a Node.js Readable to a string](/guides/streams/node-readable-to-string)
- [Convert a Node.js Readable to JSON](/guides/streams/node-readable-to-json)
- [Convert a Node.js Readable to a Blob](/guides/streams/node-readable-to-blob)
- [Convert a Node.js Readable to an Uint8Array](/guides/streams/node-readable-to-uint8array)
- [Convert a Node.js Readable to an ArrayBuffer](/guides/streams/node-readable-to-arraybuffer)

## Test runner

- [Run your tests with the Bun test runner](/guides/test/run-tests)
- [Run tests in watch mode with Bun](/guides/test/watch-mode)
- [Migrate from Jest to Bun's test runner](/guides/test/migrate-from-jest)
- [Mock functions in `bun test`](/guides/test/mock-functions)
- [Spy on methods in `bun test`](/guides/test/spy-on)
- [Set the system time in Bun's test runner](/guides/test/mock-clock)
- [Use snapshot testing in `bun test`](/guides/test/snapshot)
- [Update snapshots in `bun test`](/guides/test/update-snapshots)
- [Generate code coverage reports with the Bun test runner](/guides/test/coverage)
- [Set a code coverage threshold with the Bun test runner](/guides/test/coverage-threshold)
- [Selectively run tests concurrently with glob patterns](/guides/test/concurrent-test-glob)
- [Skip tests with the Bun test runner](/guides/test/skip-tests)
- [Mark a test as a "todo" with the Bun test runner](/guides/test/todo-tests)
- [Set a per-test timeout with the Bun test runner](/guides/test/timeout)
- [Bail early with the Bun test runner](/guides/test/bail)
- [Re-run tests multiple times with the Bun test runner](/guides/test/rerun-each)
- [Using Testing Library with Bun](/guides/test/testing-library)
- [Write browser DOM tests with Bun and happy-dom](/guides/test/happy-dom)
- [import, require, and test Svelte components with bun test](/guides/test/svelte-test)

## Utilities

- [Upgrade Bun to the latest version](/guides/util/upgrade)
- [Detect when code is executed with Bun](/guides/util/detect-bun)
- [Get the current Bun version](/guides/util/version)
- [Hash a password](/guides/util/hash-a-password)
- [Generate a UUID](/guides/util/javascript-uuid)
- [Encode and decode base64 data](/guides/util/base64)
- [Compress and decompress data with gzip](/guides/util/gzip)
- [Compress and decompress data with DEFLATE](/guides/util/deflate)
- [Escape an HTML string](/guides/util/escape-html)
- [Check if two objects are deeply equal](/guides/util/deep-equals)
- [Sleep for a fixed number of milliseconds](/guides/util/sleep)
- [Convert a file URL to an absolute path](/guides/util/file-url-to-path)
- [Convert an absolute path to a file URL](/guides/util/path-to-file-url)
- [Get the path to an executable bin file](/guides/util/which-path-to-executable-bin)
- [Get the directory of the current file](/guides/util/import-meta-dir)
- [Get the file name of the current file](/guides/util/import-meta-file)
- [Get the absolute path of the current file](/guides/util/import-meta-path)
- [Check if the current file is the entrypoint](/guides/util/entrypoint)
- [Get the absolute path to the current entrypoint](/guides/util/main)

## WebSocket

- [Build a simple WebSocket server](/guides/websocket/simple)
- [Build a publish-subscribe WebSocket server](/guides/websocket/pubsub)
- [Set per-socket contextual data on a WebSocket](/guides/websocket/context)
- [Enable compression for WebSocket messages](/guides/websocket/compression)

## Writing files

- [Write a string to a file](/guides/write-file/basic)
- [Write a Blob to a file](/guides/write-file/blob)
- [Write a Response to a file](/guides/write-file/response)
- [Append content to a file](/guides/write-file/append)
- [Write a file incrementally](/guides/write-file/filesink)
- [Write a ReadableStream to a file](/guides/write-file/stream)
- [Write to stdout](/guides/write-file/stdout)
- [Write a file to stdout](/guides/write-file/cat)
- [Copy a file to another location](/guides/write-file/file-cp)
- [Delete a file](/guides/write-file/unlink)
