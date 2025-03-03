# @mizchi/zodcli

Type-safe command-line parser module using Zod

## Overview

ZodCLI is a Deno module for easily building type-safe command-line interfaces
using [Zod](https://github.com/colinhacks/zod) schemas. With this module, you
can parse command-line arguments, validate inputs, and generate help messages in
a type-safe manner.

## Features

- **Type-Safe**: Type-safe CLI parser based on Zod schemas
- **Automatic Help Generation**: Automatically generates help text from command
  structures
- **Positional Arguments and Options Support**: Supports both positional and
  named arguments
- **Advanced Positional Arguments**: Supports index-based position control and
  rest arguments
- **Nested Command Support**: Supports nested command structures like git
- **Default Values**: Leverages Zod features for setting default values
- **Validation**: Powerful input validation with Zod schemas
- **JSON Schema Conversion**: Convert Zod schemas to JSON schemas
- **Multiple Parse Styles**: Supports both exception-throwing and Result-based
  parsing
- **Type Inference**: Improved type inference for better TypeScript experience

## Installation

```bash
deno add jsr:@mizchi/zodcli
```

Or import directly:

```typescript
import { createParser } from "jsr:@mizchi/zodcli";
```

## Basic Usage

```typescript
import { createParser } from "jsr:@mizchi/zodcli";
import { z } from "npm:zod";

// Define a parser
const searchParser = createParser({
  name: "search",
  description: "Search with custom parameters",
  args: {
    query: {
      type: z.string().describe("search query"),
      positional: 0,
    },
    count: {
      type: z.number().optional().default(5).describe("number of results"),
      short: "c",
    },
    format: {
      type: z.enum(["json", "text", "table"]).default("text"),
      short: "f",
    },
  },
});

// run help
if (
  Deno.args.length === 0 ||
  Deno.args.includes("--help") ||
  Deno.args.includes("-h")
) {
  console.log(searchParser.help());
  Deno.exit(0);
}

// Option 1: Parse arguments with exception handling
try {
  const data = searchParser.parse(Deno.args);
  console.log(
    `Searching for: ${data.query}, count: ${data.count}, format: ${data.format}`,
  );
} catch (error) {
  console.error(error.message);
  console.log(searchParser.help());
}

// Option 2: Parse arguments with Result pattern (Zod-style)
const result = searchParser.safeParse(Deno.args);
if (result.ok) {
  console.log(
    `Searching for: ${result.data.query}, count: ${result.data.count}, format: ${result.data.format}`,
  );
} else {
  console.error(result.error.message);
  console.log(searchParser.help());
}
```

## Using Nested Commands

```typescript
import { createNestedParser, run } from "jsr:@mizchi/zodcli";
import { z } from "npm:zod";

// Define nested command parser
const gitParser = createNestedParser(
  {
    add: {
      name: "git add",
      description: "Add files to git staging",
      args: {
        files: {
          type: z.string().array().describe("files to add"),
          positional: true,
        },
        all: {
          type: z.boolean().default(false).describe("add all files"),
          short: "a",
        },
      },
    },
    commit: {
      name: "git commit",
      description: "Commit staged changes",
      args: {
        message: {
          type: z.string().describe("commit message"),
          positional: true,
        },
        amend: {
          type: z.boolean().default(false).describe("amend previous commit"),
          short: "a",
        },
      },
    },
  },
  "git",
  "Git command line tool",
);

// Option 1: Parse arguments with exception handling
try {
  const { command, data } = gitParser.parse(Deno.args);
  console.log(`Running git ${command}`);

  if (command === "add") {
    console.log(`Adding files: ${data.files.join(", ")}`);
  } else if (command === "commit") {
    console.log(`Committing with message: ${data.message}`);
  }
} catch (error) {
  console.error(error.message);
  console.log(gitParser.help());
}

// Option 2: Parse arguments with Result pattern
const result = gitParser.safeParse(Deno.args);
if (result.ok) {
  const { command, data } = result.data;
  console.log(`Running git ${command}`);

  if (command === "add") {
    console.log(`Adding files: ${data.files.join(", ")}`);
  } else if (command === "commit") {
    console.log(`Committing with message: ${data.message}`);
  }
} else {
  console.error(result.error.message);
  console.log(gitParser.help());
}
```

## Advanced Type Safety

To enhance type safety and catch errors at compile time, you can use type
constraints with your schema definitions. This approach helps to ensure that
your schema conforms to the expected structure before runtime.

### Using CommandSchema Type Constraint

```typescript
import { type CommandSchema, createParser } from "jsr:@mizchi/zodcli";
import { z } from "npm:zod";

// Define your schema with type constraint
const searchArgsSchema = {
  query: {
    type: z.string().describe("search query"),
    positional: 0,
  },
  count: {
    type: z.number().optional().default(5).describe("number of results"),
    short: "c",
  },
  format: {
    type: z.enum(["json", "text", "table"]).default("text"),
    short: "f",
  },
} as const as CommandSchema; // Apply 'as const' and CommandSchema constraint

// Create parser with type-checked schema
const searchParser = createParser({
  name: "search",
  description: "Search with custom parameters",
  args: searchArgsSchema,
});

// Now any schema errors would be caught at compile time
```

The `as const` assertion ensures that object literals are treated as readonly
with their values narrowed to specific literal types, rather than wider types.
Combined with the `ParserSchema` type constraint, this approach provides early
detection of schema errors.

### Benefits of Enhanced Type Safety

- **Early Error Detection**: Catch schema errors during development instead of
  at runtime
- **Improved Autocomplete**: Better IDE suggestions when working with your
  schemas
- **Type Narrowing**: More precise types for enum values and other literals
- **Safer Refactoring**: Changes to your schema structure are type-checked

This pattern is especially useful for larger CLI applications with complex
argument structures, where runtime errors might be more difficult to detect
during testing.

## Advanced Positional Arguments

There are three ways to specify positional arguments:

### **Rest Arguments**: `positional: '...'` - Capture all remaining positional arguments as an array

```typescript
{
  command: {
    type: z.string(),
    positional: 0, // First positional argument
  },
  args: {
    type: z.string().array(),
    positional: '...', // All remaining arguments
  }
}
```

In this example, `command` is the first argument and all subsequent arguments
are captured as an array in `args`.

## Supported Types

- `z.string()` - Strings
- `z.number()` - Numbers (automatically converted from strings)
- `z.boolean()` - Booleans
- `z.enum()` - Enumerations
- `z.array()` - Arrays (for positional arguments or multiple option values)
- `z.optional()` - Optional values
- `z.default()` - Fields with default values

## API Reference

### Core Functions

- **`createParser(definition)`**: Creates a new parser from a command schema
  definition
- **`createNestedParser(commandMap, options)`**: Creates a nested command parser

### Parser Methods

- **`.parse(args)`**: Parses arguments and throws an exception on error
- **`.safeParse(args)`**: Parses arguments and returns a Result-style object
- **`.help()`**: Returns the help text for the command
- **`.zodSchema`**: The Zod schema object
- **`.jsonSchema`**: The equivalent JSON schema

### Legacy API (Deprecated)

The following functions are maintained for backward compatibility:

- **`createCommand(definition)`**: Legacy version of `createParser`
- **`createSubParser(commandMap, options)`**: Legacy alternative to
  `createNestedParser`
- **`createNestedCommands(commandMap)`**: Lower-level implementation used by
  `createNestedParser`

## Testing

```bash
deno test
```

## License

MIT

## Localized Documentation

- [日本語版 (Japanese)](./README.ja.md)
