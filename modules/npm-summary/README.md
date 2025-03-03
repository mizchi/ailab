# @mizchi/npm-summary

A Deno module to extract and analyze TypeScript type definitions from npm
packages.

## Features

- Extract TypeScript declaration files from npm packages
- Analyze entry points defined in package.json
- Identify exported types, interfaces, and functions
- Automatically generate AI summaries of type definitions
- Support for caching both package content and AI summaries
- Cache downloaded packages for faster subsequent access

## Installation

### CLI Usage

```bash
# Install from JSR
deno add -A @mizchi/npm-summary

# Run directly
deno run -A jsr:@mizchi/npm-summary/cli.ts zod

# Install as a global command
deno install -Afg -n npm-summary jsr:@mizchi/npm-summary/cli
```

## CLI Usage

```bash
# Get type definitions for a package (latest version with summary)
npm-summary lodash

# Get type definitions for a specific version
npm-summary zod@3.21.4

# Force latest version download (skips cache)
npm-summary zod@latest

# Skip cache
npm-summary react --no-cache

# Output result to a file
npm-summary zod --out=zod-types.md

# Custom prompt for generating summary
npm-summary zod --prompt="Explain this package like I'm 5 years old"
npm-summary zod -p "Create a detailed guide with code examples"

# List all files in a package
npm-summary ls zod@3.21.4

# Read a specific file from a package (new format)
npm-summary read zod@latest/README.md

# Read a specific file from a package (legacy format still supported)
npm-summary read zod README.md
```

## Environment Variables

The tool supports two environment variables for the AI summary generation:

- `NPM_SUMMARY_GEMINI_API_KEY`: Primary API key for Gemini
- `GOOGLE_GENERATIVE_AI_API_KEY`: Alternative API key for Gemini

Set either one to enable AI summary generation.

## Custom Prompts

You can customize how summaries are generated using the `--prompt` (or `-p`)
option:

```bash
# Generate a summary with a custom prompt
npm-summary zod --prompt="Explain this package like I'm 5 years old"

# Short form
npm-summary react -p "Create a detailed guide with advanced examples"
```

Different prompts create different summary files, so you can generate multiple
perspectives on the same package without overwriting previous summaries.

## Cache Strategy

The tool uses an intelligent caching strategy:

- Package content is cached at
  `$HOME/.npmsummary/[package-name]/[version]/content.md`
- AI summaries are cached at:
  - Default prompt: `$HOME/.npmsummary/[package-name]/[version]/summary.md`
  - Custom prompts:
    `$HOME/.npmsummary/[package-name]/[version]/summary-[hash].md`
- Summaries are automatically generated and reused when available
- Use `--no-cache` to ignore all caching
- Use `@latest` explicitly (e.g., `zod@latest`) to force fetching the latest
  version

## License

MIT
