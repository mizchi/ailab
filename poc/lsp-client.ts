/* @script */

// LSP メッセージの型定義
type JsonRpcMessage = {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type InitializeParams = {
  processId: number | null;
  rootUri: string | null;
  capabilities: Record<string, unknown>;
  workspaceFolders:
    | Array<{
      uri: string;
      name: string;
    }>
    | null;
};

type Position = {
  line: number;
  character: number;
};

type Range = {
  start: Position;
  end: Position;
};

type DocumentSymbol = {
  name: string;
  detail?: string;
  kind: number;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
};

type HoverParams = {
  textDocument: {
    uri: string;
  };
  position: Position;
};

type DocumentSymbolParams = {
  textDocument: {
    uri: string;
  };
};

class LspClient {
  private messageId = 0;
  private process: Deno.ChildProcess;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private stdinWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private stdoutReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private debug: boolean;
  private pendingRequests: Map<number, (response: JsonRpcMessage) => void>;
  private serverReady = false;

  constructor(debug = false) {
    this.debug = debug;
    this.pendingRequests = new Map();

    // Deno LSP サーバーを起動
    this.process = new Deno.Command("deno", {
      args: ["lsp"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();

    // Writer と Reader を初期化
    this.stdinWriter = this.process.stdin.getWriter();
    this.stdoutReader = this.process.stdout.getReader();

    // デバッグモードの場合、stderr を監視
    if (this.debug) {
      this.monitorStderr();
    }

    // レスポンスの監視を開始
    this.startMessageLoop();
  }

  private async monitorStderr() {
    const stderrReader = this.process.stderr.getReader();
    try {
      while (true) {
        const { value, done } = await stderrReader.read();
        if (done) break;
        const message = this.decoder.decode(value);
        console.error("LSP Server Error:", message);
        if (message.includes("Server ready")) {
          this.serverReady = true;
        }
      }
    } catch (error) {
      console.error("Error monitoring stderr:", error);
    } finally {
      stderrReader.releaseLock();
    }
  }

  private log(...args: unknown[]) {
    if (this.debug) {
      console.log("[LSP Client]", ...args);
    }
  }

  private async readMessage(): Promise<JsonRpcMessage> {
    if (!this.stdoutReader) {
      throw new Error("Reader is not initialized");
    }

    // ヘッダーを読み込む
    let header = "";
    let contentLength = -1;
    const headerBuffer = new Uint8Array(1024);
    let headerPos = 0;

    while (true) {
      const { value, done } = await this.stdoutReader.read();
      if (done) throw new Error("Unexpected end of stream");

      for (let i = 0; i < value.length; i++) {
        headerBuffer[headerPos++] = value[i];
        // ヘッダーの終端を検出
        if (
          headerPos >= 4 &&
          headerBuffer[headerPos - 4] === 13 && // \r
          headerBuffer[headerPos - 3] === 10 && // \n
          headerBuffer[headerPos - 2] === 13 && // \r
          headerBuffer[headerPos - 1] === 10
        ) {
          // \n
          header = this.decoder.decode(headerBuffer.slice(0, headerPos - 4));
          const match = header.match(/Content-Length: (\d+)/);
          if (match) {
            contentLength = parseInt(match[1], 10);
            // 残りのバッファをコンテンツとして使用
            const remainingContent = value.slice(i + 1);
            if (remainingContent.length >= contentLength) {
              // メッセージが完全に含まれている場合
              return JSON.parse(
                this.decoder.decode(remainingContent.slice(0, contentLength)),
              );
            } else {
              // 残りのコンテンツを読み込む
              const content = new Uint8Array(contentLength);
              content.set(remainingContent);
              let contentPos = remainingContent.length;

              while (contentPos < contentLength) {
                const { value: contentChunk, done: contentDone } = await this
                  .stdoutReader.read();
                if (contentDone) {
                  throw new Error("Unexpected end of content stream");
                }
                const remaining = contentLength - contentPos;
                const chunk = contentChunk.slice(0, remaining);
                content.set(chunk, contentPos);
                contentPos += chunk.length;
              }

              return JSON.parse(this.decoder.decode(content));
            }
          }
        }
      }
    }
  }

  private async startMessageLoop() {
    try {
      while (true) {
        const message = await this.readMessage();

        this.log("Received message:", message);

        if (message.id !== undefined) {
          // リクエストのレスポンス
          const resolver = this.pendingRequests.get(message.id);
          if (resolver) {
            resolver(message);
            this.pendingRequests.delete(message.id);
          }
        } else if (message.method) {
          // サーバーからの通知
          this.log("Server notification:", message.method, message.params);
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Unexpected end of stream"
      ) {
        // 正常なシャットダウン時のエラーは無視
        return;
      }
      console.error("Message loop error:", error);
    }
  }

  private async waitForServerReady() {
    while (!this.serverReady) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private async sendRequest(
    method: string,
    params?: unknown,
  ): Promise<unknown> {
    if (!this.stdinWriter) {
      throw new Error("Writer is not initialized");
    }

    const id = this.messageId++;
    const message: JsonRpcMessage = {
      jsonrpc: "2.0",
      id,
      method,
      ...(params !== undefined ? { params } : {}),
    };

    this.log("Sending request:", method, params);

    const content = JSON.stringify(message);
    const contentLength = this.encoder.encode(content).length;
    const header = `Content-Length: ${contentLength}\r\n\r\n`;

    // リクエストを送信
    await this.stdinWriter.write(this.encoder.encode(header + content));

    // レスポンスを待機
    const response = await new Promise<JsonRpcMessage>((resolve) => {
      this.pendingRequests.set(id, resolve);
    });

    if (response.error) {
      throw new Error(`LSP Error: ${response.error.message}`);
    }
    return response.result;
  }

  private async sendNotification(method: string, params?: unknown) {
    if (!this.stdinWriter) {
      throw new Error("Writer is not initialized");
    }

    const message: JsonRpcMessage = {
      jsonrpc: "2.0",
      method,
      ...(params !== undefined ? { params } : {}),
    };

    this.log("Sending notification:", method, params);

    const content = JSON.stringify(message);
    const contentLength = this.encoder.encode(content).length;
    const header = `Content-Length: ${contentLength}\r\n\r\n`;

    await this.stdinWriter.write(this.encoder.encode(header + content));
  }

  async initialize() {
    const cwd = Deno.cwd();
    const params: InitializeParams = {
      processId: Deno.pid,
      rootUri: `file://${cwd}`,
      workspaceFolders: [
        {
          uri: `file://${cwd}`,
          name: "workspace",
        },
      ],
      capabilities: {
        textDocument: {
          hover: {
            dynamicRegistration: true,
            contentFormat: ["markdown", "plaintext"],
          },
          synchronization: {
            dynamicRegistration: true,
            didSave: true,
            willSave: true,
          },
          documentSymbol: {
            dynamicRegistration: true,
            hierarchicalDocumentSymbolSupport: true,
          },
        },
        workspace: {
          workspaceFolders: true,
        },
      },
    };
    return await this.sendRequest("initialize", params);
  }

  async initialized() {
    await this.sendNotification("initialized", {});
    await this.waitForServerReady();
  }

  async didOpen(uri: string, text: string) {
    await this.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: "typescript",
        version: 1,
        text,
      },
    });
  }

  async getDocumentSymbols(uri: string): Promise<DocumentSymbol[]> {
    const params: DocumentSymbolParams = {
      textDocument: { uri },
    };
    return (await this.sendRequest(
      "textDocument/documentSymbol",
      params,
    )) as DocumentSymbol[];
  }

  async getHoverByRange(uri: string, position: Position) {
    const params: HoverParams = {
      textDocument: { uri },
      position,
    };
    return await this.sendRequest("textDocument/hover", params);
  }

  async close() {
    try {
      // シャットダウンリクエストを送信
      await this.sendRequest("shutdown");
      await this.sendNotification("exit");

      // Writer と Reader を解放
      if (this.stdinWriter) {
        await this.stdinWriter.close();
        this.stdinWriter = null;
      }
      if (this.stdoutReader) {
        await this.stdoutReader.cancel();
        this.stdoutReader = null;
      }

      // プロセスを終了
      this.process.kill("SIGTERM");
      await this.process.status;
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  async [Symbol.asyncDispose]() {
    await this.close();
  }
}

if (import.meta.main) {
  await using client = new LspClient(true); // デバッグモードを有効化

  // 初期化
  console.log("Initializing LSP client...");
  await client.initialize();
  console.log("Sending initialized notification...");
  await client.initialized();

  // test.ts のパスを取得
  const testPath = new URL("./test.ts", import.meta.url).pathname;
  const testUri = `file://${testPath}`;
  const testContent = await Deno.readTextFile(testPath);

  console.log("Opening test.ts...");
  await client.didOpen(testUri, testContent);

  // ファイルを開いた後少し待つ
  // await new Promise((resolve) => setTimeout(resolve, 100));

  // シンボル情報を取得
  // console.log("Requesting document symbols...");
  const symbols = await client.getDocumentSymbols(testUri);
  console.log("[lsp] Document symbols:", symbols);

  // double 関数のシンボルを探す
  const doubleSymbol = symbols.find((s) => s.name === "double");
  if (!doubleSymbol) {
    console.log("Found double function symbol:", doubleSymbol);
    Deno.exit(1);
  }
  // 関数の位置でホバー情報を取得
  // console.log("Requesting hover information...");
  const hoverResult = await client.getHoverByRange(
    testUri,
    doubleSymbol.selectionRange.start,
  );
  console.log("[lsp] 'double' function:", hoverResult);
}
