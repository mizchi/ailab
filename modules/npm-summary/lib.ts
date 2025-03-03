import { globToRegExp, join, pako, tar, textDecoder } from "./deps.ts";
import type { GetPackageFilesOptions, Package } from "./types.ts";
import { DEFAULT_INCLUDE_PATTERNS } from "./types.ts";

const DEFAULT_NPM_REGISTRY = `https://registry.npmjs.org`;
const PACK_FILE_PREFIX = "package/";

/**
 * Extract specific keys from an object
 */
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

/**
 * Filter package.json to include only necessary fields
 */
export function filterPackageJson(pkgJson: any): Package {
  return pick(pkgJson, [
    "name",
    "version",
    "main",
    "module",
    "types",
    "typings",
    "exports",
    "dependencies",
    "peerDependencies",
  ]);
}

/**
 * Get the home directory path
 */
export function getHomeDir(): string {
  // Get home directory from Deno environment variables
  const home = Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
  if (!home) {
    throw new Error("HOME or USERPROFILE environment variable not set");
  }
  return home;
}

/**
 * Get the package cache directory
 */
export function getCacheDir(pkgName: string, version: string): string {
  const home = getHomeDir();
  // Process scoped package names (@scope/pkg → scope-pkg)
  const normalizedPkgName = pkgName.replace(/^@/, "").replace(/\//, "-");
  return join(home, ".npmsummary", normalizedPkgName, version);
}

/**
 * Check if directory exists, create if it doesn't
 */
export async function ensureDir(dir: string): Promise<void> {
  try {
    await Deno.mkdir(dir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}

/**
 * Fetch package information from the npm registry
 */
export async function fetchPackageInfo(
  packageName: string,
  version?: string,
): Promise<any> {
  // Handle encoding for scoped packages
  const encodedPackageName = packageName.startsWith("@")
    ? `@${encodeURIComponent(packageName.substring(1))}`
    : encodeURIComponent(packageName);

  const url = version
    ? `https://registry.npmjs.org/${encodedPackageName}/${version}`
    : `https://registry.npmjs.org/${encodedPackageName}/latest`;

  console.log(`Fetching from URL: ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch package info: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}

/**
 * Load tarball from cache or download and save to cache
 */
export async function getTarball(
  pkgName: string,
  version: string,
  tarUrl: string,
): Promise<Uint8Array> {
  const cacheDir = getCacheDir(pkgName, version);
  const tarballPath = join(cacheDir, "raw.tar.gz");

  // Check cache
  try {
    const stat = await Deno.stat(tarballPath);
    if (stat.isFile && stat.size > 0) {
      console.log(`Using cached tarball from: ${tarballPath}`);
      return await Deno.readFile(tarballPath);
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      console.warn(`Error checking cache: ${error}`);
    }
    // Continue to download if not in cache
  }

  // Download tarball
  console.log(`Downloading tarball from: ${tarUrl}`);
  const response = await fetch(tarUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download tarball: ${response.status} ${response.statusText}`,
    );
  }

  const data = new Uint8Array(await response.arrayBuffer());

  // Create cache directory
  await ensureDir(cacheDir);

  // Save tarball to cache
  await Deno.writeFile(tarballPath, data);
  console.log(`Cached tarball to: ${tarballPath}`);

  return data;
}

/**
 * Read content from ReadableStream
 */
export async function readEntryContent(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Combine all chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const content = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    content.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(content);
}

/**
 * Extract type information summary from a definition file
 */
export function extractTypeInfo(dtsContent: string): string[] {
  // Simple pattern to extract exported types
  const exportedTypes: string[] = [];

  // Detect interfaces
  const interfaceMatches = dtsContent.matchAll(/export\s+interface\s+(\w+)/g);
  for (const match of interfaceMatches) {
    if (match[1]) exportedTypes.push(`interface ${match[1]}`);
  }

  // Detect type aliases
  const typeMatches = dtsContent.matchAll(/export\s+type\s+(\w+)/g);
  for (const match of typeMatches) {
    if (match[1]) exportedTypes.push(`type ${match[1]}`);
  }

  // Detect enums
  const enumMatches = dtsContent.matchAll(/export\s+enum\s+(\w+)/g);
  for (const match of enumMatches) {
    if (match[1]) exportedTypes.push(`enum ${match[1]}`);
  }

  // Detect function and variable exports
  const constFuncMatches = dtsContent.matchAll(
    /export\s+(const|function|class)\s+(\w+)/g,
  );
  for (const match of constFuncMatches) {
    if (match[2]) exportedTypes.push(`${match[1]} ${match[2]}`);
  }

  // Detect default exports
  const defaultExportMatch = dtsContent.match(/export\s+default\s+(\w+)/);
  if (defaultExportMatch && defaultExportMatch[1]) {
    exportedTypes.push(`default ${defaultExportMatch[1]}`);
  }

  return exportedTypes;
}

/**
 * Normalize path (remove ./ prefix)
 */
export function normalizePath(path: string): string {
  if (path.startsWith("./")) {
    return path.substring(2);
  }
  return path;
}

/**
 * Convert JavaScript file path to corresponding TypeScript definition file path
 */
export function convertToDefinitionPath(path: string): string {
  if (path.endsWith(".js")) {
    return path.replace(/\.js$/, ".d.ts");
  }
  return path;
}

/**
 * Extract entry points from package.json
 * @param pkg Package JSON
 * @returns Map of entry points (import path => type definition file path)
 */
export function getEntrypoints(pkg: Package): Map<string, string> {
  const entrypoints = new Map<string, string>();

  // Import path key for main entry point
  const mainEntryKey = "";

  // 1. Get main type definition file path (trim ./)
  if (pkg.types || pkg.typings) {
    const mainTypesPath = normalizePath(pkg.types || pkg.typings || "");
    entrypoints.set(mainEntryKey, mainTypesPath);
  }

  // 2. Extract entry points from exports field
  if (pkg.exports && typeof pkg.exports === "object") {
    // 2.1 Process main entry point (.)
    if (pkg.exports["."] !== undefined) {
      const mainExport = pkg.exports["."];

      // Object format
      if (typeof mainExport === "object" && mainExport !== null) {
        if (mainExport.types && typeof mainExport.types === "string") {
          entrypoints.set(mainEntryKey, normalizePath(mainExport.types));
        }
      } // String format
      else if (typeof mainExport === "string") {
        const typesPath = convertToDefinitionPath(mainExport);
        entrypoints.set(mainEntryKey, normalizePath(typesPath));
      }
    }

    // 2.2 Process subpath entry points
    for (const [key, value] of Object.entries(pkg.exports)) {
      // Skip main entry point and package.json
      if (key === "." || key === "./package.json") continue;

      const importPath = key.startsWith("./") ? key.substring(2) : key;

      // 2.2.1 Object format exports
      if (typeof value === "object" && value !== null) {
        const typesPath = (value as any).types || (value as any).typescript;
        if (typesPath && typeof typesPath === "string") {
          entrypoints.set(importPath, normalizePath(typesPath));
        }
      } // 2.2.2 String format exports (convert .js to .d.ts)
      else if (typeof value === "string") {
        const typesPath = convertToDefinitionPath(value);
        entrypoints.set(importPath, normalizePath(typesPath));
      }
    }
  }

  return entrypoints;
}

/**
 * Convert import path to simple format
 * @param importPath Import path
 * @param pkgName Package name
 * @returns Converted path. "" -> x, foo -> x/foo
 */
export function formatImportPath(importPath: string, pkgName: string): string {
  if (importPath === "") {
    return pkgName;
  } else {
    return `${pkgName}/${importPath}`;
  }
}

/**
 * Function to find type definition file
 * Tries multiple possible paths
 */
export function findDtsFile(
  dtsFiles: Map<string, string>,
  possiblePaths: string[],
): string | null {
  for (const path of possiblePaths) {
    if (dtsFiles.has(path)) {
      return path;
    }
  }
  return null;
}

/**
 * Check content from cache
 */
export async function getContentFromCache(
  pkgName: string,
  version: string,
): Promise<string | null> {
  const cacheDir = getCacheDir(pkgName, version);
  const contentPath = join(cacheDir, "content.md");

  try {
    const stat = await Deno.stat(contentPath);
    if (stat.isFile && stat.size > 0) {
      console.log(`Using cached content from: ${contentPath}`);
      return await Deno.readTextFile(contentPath);
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      console.warn(`Error checking content cache: ${error}`);
    }
  }

  return null;
}

/**
 * Save content to cache
 */
export async function saveContentToCache(
  pkgName: string,
  version: string,
  content: string,
): Promise<void> {
  const cacheDir = getCacheDir(pkgName, version);
  const contentPath = join(cacheDir, "content.md");

  await ensureDir(cacheDir);
  await Deno.writeTextFile(contentPath, content);
  console.log(`Cached content to: ${contentPath}`);
}
/**
 * Get summary file name based on prompt
 */
export async function getSummaryFileName(prompt?: string): Promise<string> {
  // プロンプトが指定されていない場合は、デフォルトの summary.md を使用
  if (!prompt) {
    return "summary.md";
  }

  // プロンプトからハッシュを生成して、ファイル名に使用
  const hash = await generateHash(prompt);
  return `summary-${hash}.md`;
}

/**
 * Check summary from cache
 */
export async function getSummaryFromCache(
  pkgName: string,
  version: string,
  prompt?: string,
): Promise<string | null> {
  const cacheDir = getCacheDir(pkgName, version);
  const summaryFileName = await getSummaryFileName(prompt);
  const summaryPath = join(cacheDir, summaryFileName);

  try {
    const stat = await Deno.stat(summaryPath);
    if (stat.isFile && stat.size > 0) {
      console.log(`Using cached summary from: ${summaryPath}`);
      return await Deno.readTextFile(summaryPath);
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      console.warn(`Error checking summary cache: ${error}`);
    }
  }

  return null;
}

/**
 * Save summary to cache
 */
export async function saveSummaryToCache(
  pkgName: string,
  version: string,
  summary: string,
  prompt?: string,
): Promise<void> {
  const cacheDir = getCacheDir(pkgName, version);
  const summaryFileName = await getSummaryFileName(prompt);
  const summaryPath = join(cacheDir, summaryFileName);

  await ensureDir(cacheDir);
  await Deno.writeTextFile(summaryPath, summary);
  console.log(`Cached summary to: ${summaryPath}`);
}

/**
 * Estimate token count (simplified version)
 * Different from actual tokenizers, but useful as a rough estimate
 */
export function estimateTokenCount(text: string): number {
  // Word count + special characters for approximate estimation
  // For English, about 1 token per 4 characters on average
  // For code, we estimate slightly higher
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;

  // 1 token per word + additional tokens for special characters and numbers
  return Math.ceil(wordCount + charCount / 8);
}

/**
 * Generate an SHA-256 hash from a string
 */
export async function generateHash(text: string): Promise<string> {
  // テキストをUTF-8エンコードのバイト配列に変換
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // SHA-256ハッシュを計算
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // ハッシュバッファを16進数文字列に変換
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // 最初の8文字だけを使用（十分に衝突を避けるため）
  return hashHex.substring(0, 8);
}

/**
 * Generate summary using Gemini API
 */
export async function generateSummary(
  content: string,
  token?: string,
  customPrompt?: string,
): Promise<string> {
  const apiKey = token ||
    Deno.env.get("NPM_SUMMARY_GEMINI_API_KEY") ||
    Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "API token is not provided and neither NPM_SUMMARY_GEMINI_API_KEY nor GOOGLE_GENERATIVE_AI_API_KEY environment variable is set",
    );
  }

  // Estimate token count
  const tokenCount = estimateTokenCount(content);
  console.log(`Estimated token count: ${tokenCount}`);

  // Warning if token count is too high
  // gemini-flash-lite context length is 1,048,576
  const MAX_TOKENS = 1_000_000;
  if (tokenCount > MAX_TOKENS) {
    console.warn(
      `Warning: Content exceeds the Gemini model context length (approximately ${tokenCount} tokens > ${MAX_TOKENS}). API may fail.`,
    );
  }

  console.log("Generating summary using Gemini API...");

  // デフォルトのプロンプトテンプレート
  const defaultPrompt =
    `Create a concise library cheatsheet for the following npm package type definitions. Structure your response with these sections:

# <pkg-name>@<version>

## Usage
Provide a short code example demonstrating the most common use case.

\`\`\`ts
import {symbols} from "...";
\`\`\`

## Types
List and explain the main types, interfaces, and functions with their purposes.

## API
Show import examples and the most important API functions/methods developers would use.
For example:
\`\`\`ts
import { symbolNames } from "...";
// Key API methods and their usage
\`\`\`

Focus on the most important and useful parts of the API that developers would need to know.`;

  // カスタムプロンプトが指定されていれば使用、そうでなければデフォルトを使用
  const promptText = customPrompt || defaultPrompt;

  // カスタムプロンプトを使用する場合、ログに出力
  if (customPrompt) {
    console.log("Using custom prompt for summary generation");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  `${promptText}\n\nHere's the content to summarize:\n\n${content}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024 * 30,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  // Validate response structure
  if (
    !result.candidates ||
    !Array.isArray(result.candidates) ||
    result.candidates.length === 0
  ) {
    throw new Error(
      `Unexpected API response structure: no candidates found. Response: ${
        JSON.stringify(
          result,
        )
      }`,
    );
  }

  const candidate = result.candidates[0];
  if (
    !candidate.content ||
    !candidate.content.parts ||
    !Array.isArray(candidate.content.parts) ||
    candidate.content.parts.length === 0
  ) {
    throw new Error(
      `Unexpected API response structure: invalid content or parts in candidate. Response: ${
        JSON.stringify(
          candidate,
        )
      }`,
    );
  }

  // Get text from response
  const part = candidate.content.parts[0];
  if (!part.text) {
    throw new Error(
      `Unexpected API response structure: no text in first part. Response: ${
        JSON.stringify(
          part,
        )
      }`,
    );
  }

  return part.text;
}

/**
 * Get file list from tarball
 */
export async function listPackageFiles(
  pkgName: string,
  version: string,
  opts?: GetPackageFilesOptions,
): Promise<string[]> {
  const _endpoint = opts?.endpoint ?? DEFAULT_NPM_REGISTRY;
  const _useCache = opts?.useCache ?? true;

  // Get package information
  const packageInfo = await fetchPackageInfo(pkgName, version);

  // Use the retrieved version if none specified
  const actualVersion = packageInfo.version || version;
  const tarUrl = packageInfo.dist.tarball;

  // Get tarball (from cache or download new)
  const data = await getTarball(pkgName, actualVersion, tarUrl);

  // Extract tarball
  const rawtar = pako.ungzip(data);
  const result = tar.untar(rawtar) as Array<{ name: string; data: Uint8Array }>;

  // Extract filenames (remove package/ prefix)
  return result
    .map((entry) => {
      if (entry.name.startsWith(PACK_FILE_PREFIX)) {
        return entry.name.substring(PACK_FILE_PREFIX.length);
      }
      return entry.name;
    })
    .sort();
}

/**
 * Get specific file from tarball
 */
export async function readPackageFile(
  pkgName: string,
  version: string,
  filePath: string,
  opts?: GetPackageFilesOptions,
): Promise<string | null> {
  const _endpoint = opts?.endpoint ?? DEFAULT_NPM_REGISTRY;
  const _useCache = opts?.useCache ?? true;

  // Get package information
  const packageInfo = await fetchPackageInfo(pkgName, version);

  // Use the retrieved version if none specified
  const actualVersion = packageInfo.version || version;
  const tarUrl = packageInfo.dist.tarball;

  // Get tarball (from cache or download new)
  const data = await getTarball(pkgName, actualVersion, tarUrl);

  // Extract tarball
  const rawtar = pako.ungzip(data);
  const result = tar.untar(rawtar) as Array<{ name: string; data: Uint8Array }>;

  // Find the specified file
  const targetPath = `${PACK_FILE_PREFIX}${filePath}`;
  const file = result.find((entry) => entry.name === targetPath);

  if (!file) {
    return null;
  }

  return textDecoder.decode(file.data);
}

/**
 * Get TypeScript type definition files from npm package
 */
export async function getPackageFiles(
  pkgName: string,
  version: string,
  opts?: GetPackageFilesOptions,
): Promise<string> {
  const _endpoint = opts?.endpoint ?? DEFAULT_NPM_REGISTRY;
  const useCache = opts?.useCache ?? true;
  const shouldGenerateSummary = opts?.generateSummary ?? false;

  // Get content and summary from cache
  if (useCache) {
    // If summary generation is requested
    if (shouldGenerateSummary) {
      // Check summary from cache
      const cachedSummary = await getSummaryFromCache(
        pkgName,
        version,
        opts?.prompt,
      );
      if (cachedSummary) {
        console.log(`Using cached summary for ${pkgName}@${version}`);
        return cachedSummary;
      }
    }

    // Check normal content cache
    const cachedContent = await getContentFromCache(pkgName, version);
    if (cachedContent) {
      // If summary generation is requested but no summary cache
      if (shouldGenerateSummary) {
        try {
          console.log(
            `Generating summary for ${pkgName}@${version} from cached content`,
          );
          const summary = await generateSummary(
            cachedContent,
            undefined,
            opts?.prompt,
          );
          await saveSummaryToCache(pkgName, version, summary, opts?.prompt);
          return summary;
        } catch (error) {
          console.error(`Failed to generate summary: ${error}`);
          return cachedContent;
        }
      }
      return cachedContent;
    }
  }

  // Get package information
  const packageInfo = await fetchPackageInfo(pkgName, version);

  // Use the retrieved version if none specified
  const actualVersion = packageInfo.version || version;

  const tarUrl = packageInfo.dist.tarball;

  // Get tarball (from cache or download new)
  const data = await getTarball(pkgName, actualVersion, tarUrl);

  // Extract tarball
  const rawtar = pako.ungzip(data);
  const result = tar.untar(rawtar) as Array<{ name: string; data: Uint8Array }>;

  // Prepare options
  const localOpts = { ...opts };

  // Function to read files in tarball
  const readFileInTar = (name: string) => {
    const file = result.find((x) => `${PACK_FILE_PREFIX}${name}` === x.name);
    if (!file) return null;
    return textDecoder.decode(file.data);
  };

  let output = "";

  // Extract package.json
  const pkgJson = readFileInTar("package.json");
  if (!pkgJson) {
    throw new Error("package.json not found");
  }
  const pkg = filterPackageJson(JSON.parse(pkgJson));

  output += `\n<package.json>\n${
    JSON.stringify(
      pkg,
      null,
      2,
    )
  }\n</package.json>\n`;

  // Get entry points
  const entrypoints = getEntrypoints(pkg);

  // Find type definition files
  const dtsFiles: Map<string, string> = new Map();

  // Search for type definition files
  for (const entry of result) {
    // Extract files like package/xxx.d.ts
    if (
      entry.name.endsWith(".d.ts") &&
      entry.name.startsWith(PACK_FILE_PREFIX)
    ) {
      const fileName = entry.name.substring(PACK_FILE_PREFIX.length);
      dtsFiles.set(fileName, textDecoder.decode(entry.data));
    }
  }

  // Output entry points and corresponding type definition files
  output += `\n<Entrypoints>\n`;

  if (entrypoints.size > 0) {
    for (const [importPath, typesPath] of entrypoints) {
      const formattedPath = formatImportPath(importPath, pkg.name);

      // Create list of possible paths
      const possiblePaths = [
        typesPath,
        `${typesPath.replace(/\.d\.ts$/, "")}.d.ts`, // Add extension if missing
        `${typesPath}/index.d.ts`, // For directories
      ];

      // Find type definition file
      const foundDtsPath = findDtsFile(dtsFiles, possiblePaths);

      if (foundDtsPath) {
        const content = dtsFiles.get(foundDtsPath)!;
        output += `/// filename: ${formattedPath}\n${content}\n\n`;
      } else {
        output +=
          `/// filename: ${formattedPath}\n// (No corresponding .d.ts file found)\n\n`;
      }
    }
  } else {
    output += `No entry points defined in package.json\n`;
  }

  output += `</Entrypoints>\n`;

  // Extract type information (maintaining traditional method)
  if (dtsFiles.size > 0) {
    output += `\n<TypeScript Exports>\n`;

    // Identify main definition file from types or typings property
    let mainDtsFile = pkg.types || pkg.typings;
    if (mainDtsFile && mainDtsFile.startsWith("./")) {
      mainDtsFile = mainDtsFile.substring(2);
    }

    // Prioritize main definition file
    if (mainDtsFile && dtsFiles.has(mainDtsFile)) {
      const content = dtsFiles.get(mainDtsFile)!;
      const exportedTypes = extractTypeInfo(content);
      output += `Main types file (${mainDtsFile}):\n`;
      exportedTypes.forEach((type) => {
        output += `- ${type}\n`;
      });
    } else {
      // Look for index.d.ts or other main file
      const indexDts = dtsFiles.has("index.d.ts")
        ? "index.d.ts"
        : Array.from(dtsFiles.keys()).find((file) =>
          file.endsWith("/index.d.ts")
        );

      if (indexDts) {
        const content = dtsFiles.get(indexDts)!;
        const exportedTypes = extractTypeInfo(content);
        output += `Main types file (${indexDts}):\n`;
        exportedTypes.forEach((type) => {
          output += `- ${type}\n`;
        });
      } else {
        // Use first file if main file not found
        const firstDts = Array.from(dtsFiles.keys())[0];
        const content = dtsFiles.get(firstDts)!;
        const exportedTypes = extractTypeInfo(content);
        output += `Types from ${firstDts}:\n`;
        exportedTypes.forEach((type) => {
          output += `- ${type}\n`;
        });
      }
    }

    output += `\nTotal declaration files: ${dtsFiles.size}\n`;
    output += `</TypeScript Exports>\n`;
  } else {
    output +=
      `\n<TypeScript Exports>\nNo TypeScript declaration files found\n</TypeScript Exports>\n`;
  }

  // Initialize include patterns
  const includePatterns = localOpts.include ?? [...DEFAULT_INCLUDE_PATTERNS];

  // Function to check if file matches include pattern
  const matchesIncludePattern = (fileName: string): boolean => {
    return includePatterns.some((pattern) => {
      const regex = globToRegExp(pattern, { extended: true, globstar: true });
      return regex.test(fileName);
    });
  };

  // Extract README.md file (only if matches include pattern)
  const readmeVariations = [
    "README.md",
    "readme.md",
    "Readme.md",
    "README.markdown",
    "readme.markdown",
    "README",
    "readme",
  ];

  let foundReadme = false;
  for (const variant of readmeVariations) {
    // Check if README file matches include pattern
    if (matchesIncludePattern(variant)) {
      const variantFile = readFileInTar(variant);
      if (variantFile) {
        output += `\n<README>\n${variantFile}\n</README>\n`;
        foundReadme = true;
        break;
      }
    }
  }

  if (!foundReadme) {
    output +=
      `\n<README>\nNo README file found or README files are skipped\n</README>\n`;
  }

  // List all .ts files
  const tsFiles: string[] = [];
  for (const entry of result) {
    if (entry.name.endsWith(".ts") && entry.name.startsWith(PACK_FILE_PREFIX)) {
      tsFiles.push(entry.name.substring(PACK_FILE_PREFIX.length));
    }
  }

  if (tsFiles.length > 0) {
    output += `\n<TypeScript Files>\n`;
    tsFiles.sort().forEach((file) => {
      output += `${file}\n`;
    });
    output += `\nTotal TypeScript files: ${tsFiles.length}\n`;
    output += `</TypeScript Files>\n`;
  } else {
    output +=
      `\n<TypeScript Files>\nNo TypeScript files found\n</TypeScript Files>\n`;
  }

  // Save content to cache
  if (useCache) {
    await saveContentToCache(pkgName, actualVersion, output);
  }

  // If dry run is enabled, display token count and skip sending to AI
  if (localOpts.dry) {
    const tokenCount = estimateTokenCount(output);
    console.log(`\n--- DRY RUN ---`);
    console.log(`Content length: ${output.length} characters`);
    console.log(`Estimated token count: ${tokenCount} tokens`);

    // Display included files and their sizes
    console.log(`\nFiles included:`);

    // Create map of file sizes
    const fileSizes = new Map<string, number>();
    for (const entry of result) {
      if (entry.name.startsWith(PACK_FILE_PREFIX)) {
        const fileName = entry.name.substring(PACK_FILE_PREFIX.length);
        if (matchesIncludePattern(fileName)) {
          fileSizes.set(fileName, entry.data.length);
        }
      }
    }

    // Sort and display by file size
    const sortedFiles = Array.from(fileSizes.entries()).sort(
      (a, b) => b[1] - a[1],
    ); // Largest first

    for (const [fileName, size] of sortedFiles) {
      const sizeInKB = (size / 1024).toFixed(1);
      console.log(`  - ${fileName} (${sizeInKB} KB)`);
    }

    console.log(`\nInclude patterns: ${includePatterns.join(", ")}`);
    console.log(`--- END DRY RUN ---\n`);

    // gemini-flash-lite context length is 1,048,576
    const MAX_TOKENS = 1_000_000;
    if (tokenCount > MAX_TOKENS) {
      console.warn(
        `Warning: Content exceeds the Gemini model context length (approximately ${tokenCount} tokens > ${MAX_TOKENS}).`,
      );
      console.warn(
        `Consider reducing the included files or using more specific include patterns.`,
      );
    }

    // Display warning if summary generation is requested in dry run mode
    if (shouldGenerateSummary) {
      console.log(`Note: In dry run mode, summary generation is skipped.`);
    }

    return output;
  }

  // If summary generation is requested
  if (shouldGenerateSummary) {
    // First check summary cache if cache is enabled
    if (useCache) {
      const cachedSummary = await getSummaryFromCache(
        pkgName,
        actualVersion,
        localOpts.prompt,
      );
      if (cachedSummary) {
        console.log(`Using cached summary for ${pkgName}@${actualVersion}`);
        return cachedSummary;
      }
    }

    // Generate summary if no cache or cache disabled
    try {
      console.log(`Generating summary for ${pkgName}@${actualVersion}`);
      const summary = await generateSummary(
        output,
        localOpts.token,
        localOpts.prompt,
      );

      // Save summary to cache if cache is enabled
      if (useCache) {
        await saveSummaryToCache(
          pkgName,
          actualVersion,
          summary,
          localOpts.prompt,
        );
        console.log(`Saved summary to cache for ${pkgName}@${actualVersion}`);
      }

      return summary;
    } catch (error) {
      console.error(`Failed to generate summary: ${error}`);
      console.log("Returning original content instead");
    }
  }

  return output;
}
