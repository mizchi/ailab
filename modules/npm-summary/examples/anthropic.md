# @anthropic-ai/sdk

A TypeScript SDK for interacting with Anthropic's Claude AI models via the
Anthropic API.

## Usage

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"], // defaults to env var if not specified
});

async function main() {
  // Basic message creation
  const message = await client.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Hello, Claude" }],
  });

  console.log(message.content);

  // Streaming example
  const stream = await client.messages.stream({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Tell me a short story" }],
  }).on("text", (text) => {
    process.stdout.write(text);
  });

  const finalMessage = await stream.finalMessage();
}

main();
```

## Types

### Core Types

- `ClientOptions` - Options for creating an Anthropic client instance (apiKey,
  baseURL, timeout, etc.)
- `Message` - Represents a message from Claude with content, role, usage info,
  etc.
- `MessageCreateParams` - Parameters for creating a message, including model,
  messages, max_tokens, etc.
- `MessageContent` - Type representing message content (text and media)
- `MessageParam` - Single message object in a conversation with role and content
- `APIError` - Base error class with various subtypes for different API errors
  - `AuthenticationError` - Issues with API key
  - `RateLimitError` - API rate limit exceeded
  - `NotFoundError` - Resource not found
  - `InvalidRequestError` - Bad request parameters
  - And other error types

### Stream Types

- `MessageStream` - Helper class for streaming responses with methods like
  `on('text')` and `finalMessage()`
- `MessageStreamEvent` - Events emitted during streaming (content_block_delta,
  message_start, etc.)

### Beta Types

- `BetaMessageBatch` - For batch message processing
- `BetaMessageBatchCreateParams` - Parameters for creating message batches
- `BetaMessageBatchResult` - Results from a batch operation

## API

### Client Initialization

```ts
import Anthropic from "@anthropic-ai/sdk";

// Basic initialization
const client = new Anthropic({
  apiKey: "your-api-key", // Optional if set in env var
  maxRetries: 3, // Optional (default: 2)
  timeout: 60000, // Optional (default: 10 minutes)
});
```

### Messages API

```ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();

// Create a message
const message = await client.messages.create({
  model: "claude-3-5-sonnet-latest",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Explain quantum computing" }],
  temperature: 0.7, // Optional
  system: "You are a helpful AI assistant focusing on scientific explanations", // Optional
});

// Streaming with event handlers
const stream = client.messages.stream({
  model: "claude-3-5-sonnet-latest",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Write a poem about science" }],
})
  .on("text", (text) => console.log(text))
  .on("message_start", (message) => console.log("Message started"))
  .on("content_block_start", (block) => console.log("Content block started"))
  .on(
    "content_block_delta",
    (delta) => console.log("New content:", delta.delta.text),
  );

// Get final message from stream
const completeMessage = await stream.finalMessage();
```

### 
