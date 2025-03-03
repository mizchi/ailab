/**
 * npm package type definition
 */
export type Package = {
  name: string;
  version: string;
  main?: string;
  module?: string;
  types?: string;
  typings?: string;
  exports?: Record<string, any>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/**
 * npm package file retrieval options
 */
export type GetPackageFilesOptions = {
  /** npm registry endpoint */
  endpoint?: string;
  /** Whether to use cache */
  useCache?: boolean;
  /** Whether to generate an AI summary */
  generateSummary?: boolean;
  /** AI API token (used instead of environment variable) */
  token?: string;
  /** List of file patterns to include */
  include?: string[];
  /** Dry run (display file content and token count without sending to AI) */
  dry?: boolean;
  /** Custom prompt for summary generation */
  prompt?: string;
};

/**
 * Default include patterns
 */
export const DEFAULT_INCLUDE_PATTERNS = [
  "README.md",
  // deno run -A jsr:@mizchi/npm-summary/cli zod
  "package.json",
  "**/*.ts",
  "**/*.md",
];
