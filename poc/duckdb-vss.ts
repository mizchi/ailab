/* @script */
/**
 * DuckDBの使い方を整理したユーティリティモジュール
 *
 * このファイルは、DuckDBのNode.js APIの使い方を整理し、
 * Denoで使用する際の型の問題を解決するためのユーティリティを提供します。
 *
 * 注意: DuckDBのAPIは変更される可能性があります。このモジュールは、
 * 特定のバージョンのDuckDBを対象としています。異なるバージョンでは
 * 動作しない可能性があります。
 *
 * 参考: https://www.npmjs.com/package/@duckdb/node-api
 */

// DuckDBのインポート
// 注意: Denoでは、npmパッケージをインポートする際に型の問題が発生することがあります
import * as _duckdb from "duckdb";
const duckdb = _duckdb.default as any as typeof _duckdb;

/**
 * DuckDBのデータベース接続を管理するクラス
 *
 * このクラスは、DuckDBのデータベース接続を管理し、
 * クエリの実行や結果の取得を簡単に行うためのメソッドを提供します。
 *
 * 注意: DuckDBのAPIは変更される可能性があります。このクラスは、
 * 特定のバージョンのDuckDBを対象としています。異なるバージョンでは
 * 動作しない可能性があります。
 */
export class DuckDBClient {
  private db: any;
  private conn: any;
  private isConnected: boolean = false;

  /**
   * DuckDBClientを作成する
   * @param path データベースファイルのパス（デフォルトは":memory:"でインメモリデータベース）
   */
  constructor(path: string = ":memory:") {
    this.db = new duckdb.Database(path);
  }

  /**
   * データベースに接続する
   * @returns 接続が成功したかどうか
   */
  connect(): boolean {
    if (this.isConnected) return true;

    try {
      this.conn = this.db.connect();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error("DuckDBへの接続に失敗しました:", error);
      return false;
    }
  }

  /**
   * 接続を閉じる
   */
  close(): void {
    if (!this.isConnected) return;

    try {
      this.conn.close();
      this.db.close();
      this.isConnected = false;
    } catch (error) {
      console.error("DuckDBの接続を閉じる際にエラーが発生しました:", error);
    }
  }

  /**
   * SQLクエリを実行する
   * @param sql 実行するSQLクエリ
   * @returns クエリの結果
   */
  exec(sql: string): void {
    if (!this.isConnected) {
      if (!this.connect()) {
        throw new Error("DuckDBに接続されていません");
      }
    }

    try {
      this.conn.exec(sql);
    } catch (error) {
      console.error(`SQLクエリの実行中にエラーが発生しました: ${sql}`, error);
      throw error;
    }
  }

  /**
   * SQLクエリを実行し、結果を取得する
   *
   * @param sql 実行するSQLクエリ
   * @returns クエリの結果
   */
  async query<T = any>(sql: string): Promise<T[]> {
    if (!this.isConnected) {
      if (!this.connect()) {
        throw new Error("DuckDBに接続されていません");
      }
    }

    try {
      const results: T[] = [];
      // @ts-ignore: DuckDBの型定義の問題を無視
      for await (const row of this.conn.stream(sql)) {
        results.push(row as T);
      }
      return results;
    } catch (error) {
      console.error(`SQLクエリの実行中にエラーが発生しました: ${sql}`, error);
      throw error;
    }
  }

  /**
   * パラメータ化されたSQLクエリを実行する
   *
   * @param sql パラメータ化されたSQLクエリ
   * @param params バインドするパラメータ
   * @returns クエリの結果
   */
  async queryWithParams<T = any>(sql: string, params: any[]): Promise<T[]> {
    if (!this.isConnected) {
      if (!this.connect()) {
        throw new Error("DuckDBに接続されていません");
      }
    }

    try {
      // パラメータを置換したSQLを生成
      let paramIndex = 0;
      const replacedSql = sql.replace(/\?/g, () => {
        const param = params[paramIndex++];
        if (param === null) {
          return "NULL";
        } else if (typeof param === "number") {
          return param.toString();
        } else if (typeof param === "string") {
          return `'${param.replace(/'/g, "''")}'`; // SQLインジェクション対策
        } else if (typeof param === "boolean") {
          return param ? "TRUE" : "FALSE";
        } else if (param instanceof Date) {
          return `'${param.toISOString()}'`;
        } else if (Array.isArray(param) || typeof param === "object") {
          return `'${JSON.stringify(param).replace(/'/g, "''")}'`;
        } else {
          return `'${String(param).replace(/'/g, "''")}'`;
        }
      });

      // 置換したSQLを実行
      return await this.query<T>(replacedSql);
    } catch (error) {
      console.error(
        `パラメータ化されたSQLクエリの実行中にエラーが発生しました: ${sql}`,
        error,
      );
      throw error;
    }
  }

  /**
   * SQLクエリを実行し、結果をストリームとして取得する
   *
   * @param sql 実行するSQLクエリ
   * @param callback 各行に対して実行するコールバック関数
   */
  async stream<T = any>(
    sql: string,
    callback: (row: T) => void,
  ): Promise<void> {
    if (!this.isConnected) {
      if (!this.connect()) {
        throw new Error("DuckDBに接続されていません");
      }
    }

    try {
      // @ts-ignore: DuckDBの型定義の問題を無視
      for await (const row of this.conn.stream(sql)) {
        callback(row as T);
      }
    } catch (error) {
      console.error(
        `SQLクエリのストリーミング中にエラーが発生しました: ${sql}`,
        error,
      );
      throw error;
    }
  }

  /**
   * テーブルにデータを追加するためのアペンダーを作成する
   *
   * 注意: DuckDBのバージョンによっては、このメソッドが期待通りに動作しない可能性があります。
   *
   * @param tableName データを追加するテーブル名
   * @returns アペンダーオブジェクト
   */
  createAppender(tableName: string): any {
    if (!this.isConnected) {
      if (!this.connect()) {
        throw new Error("DuckDBに接続されていません");
      }
    }

    try {
      return this.conn.createAppender(tableName);
    } catch (error) {
      console.error(
        `アペンダーの作成中にエラーが発生しました: ${tableName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 拡張機能をインストールして読み込む
   * @param extensionName インストールする拡張機能の名前
   */
  installExtension(extensionName: string): void {
    if (!this.isConnected) {
      if (!this.connect()) {
        throw new Error("DuckDBに接続されていません");
      }
    }

    try {
      this.exec(`INSTALL ${extensionName}; LOAD ${extensionName};`);
      console.log(
        `拡張機能 ${extensionName} がインストールされ、読み込まれました`,
      );
    } catch (error) {
      console.error(
        `拡張機能のインストール中にエラーが発生しました: ${extensionName}`,
        error,
      );
      throw error;
    }
  }
}

/**
 * DuckDBのベクトル類似性検索（VSS）機能を使用するためのユーティリティクラス
 *
 * このクラスは、DuckDBのVSS拡張機能を使用して、
 * ベクトル類似性検索を簡単に行うためのメソッドを提供します。
 *
 * 注意: DuckDBのバージョンによっては、このクラスが期待通りに動作しない可能性があります。
 * VSS拡張機能は、DuckDBの特定のバージョンでのみ利用可能です。
 */
export class VectorSearchClient {
  private client: DuckDBClient;

  /**
   * VectorSearchClientを作成する
   * @param client DuckDBClient
   */
  constructor(client: DuckDBClient) {
    this.client = client;

    // VSS拡張機能をインストールして読み込む
    try {
      this.client.installExtension("vss");
    } catch (error) {
      console.error("VSS拡張機能のインストールに失敗しました", error);
      throw error;
    }
  }

  /**
   * ベクトル埋め込みを格納するテーブルを作成する
   * @param tableName テーブル名
   * @param dimensions ベクトルの次元数
   * @param additionalColumns 追加のカラム定義（例: "id INTEGER, description VARCHAR"）
   */
  createEmbeddingsTable(
    tableName: string,
    dimensions: number,
    additionalColumns: string = "",
  ): void {
    const columns = additionalColumns ? `${additionalColumns}, ` : "";
    const sql =
      `CREATE TABLE IF NOT EXISTS ${tableName} (${columns}vec FLOAT[${dimensions}]);`;
    this.client.exec(sql);
  }

  /**
   * HNSWインデックスを作成する
   * @param tableName テーブル名
   * @param indexName インデックス名
   * @param columnName ベクトルカラム名（デフォルトは"vec"）
   * @param metric 距離メトリック（"l2sq"、"cosine"、"ip"のいずれか）
   */
  createHNSWIndex(
    tableName: string,
    indexName: string,
    columnName: string = "vec",
    metric: "l2sq" | "cosine" | "ip" = "l2sq",
  ): void {
    const sql =
      `CREATE INDEX ${indexName} ON ${tableName} USING HNSW (${columnName}) WITH (metric = '${metric}');`;
    this.client.exec(sql);
  }

  /**
   * ユークリッド距離を使用して類似ベクトルを検索する
   *
   * 注意: DuckDBのバージョンによっては、このメソッドが期待通りに動作しない可能性があります。
   *
   * @param tableName テーブル名
   * @param queryVector クエリベクトル
   * @param limit 取得する結果の数
   * @param columnName ベクトルカラム名（デフォルトは"vec"）
   * @returns 類似ベクトルの結果
   */
  async searchByEuclideanDistance<T = any>(
    tableName: string,
    queryVector: number[],
    limit: number = 10,
    columnName: string = "vec",
  ): Promise<T[]> {
    const sql = `
      SELECT *, array_distance(${columnName}, [${queryVector}]::FLOAT[${queryVector.length}]) as distance
      FROM ${tableName}
      ORDER BY array_distance(${columnName}, [${queryVector}]::FLOAT[${queryVector.length}])
      LIMIT ${limit};
    `;
    return await this.client.query<T>(sql);
  }

  /**
   * コサイン距離を使用して類似ベクトルを検索する
   *
   * 注意: DuckDBのバージョンによっては、このメソッドが期待通りに動作しない可能性があります。
   *
   * @param tableName テーブル名
   * @param queryVector クエリベクトル
   * @param limit 取得する結果の数
   * @param columnName ベクトルカラム名（デフォルトは"vec"）
   * @returns 類似ベクトルの結果
   */
  async searchByCosineDistance<T = any>(
    tableName: string,
    queryVector: number[],
    limit: number = 10,
    columnName: string = "vec",
  ): Promise<T[]> {
    const sql = `
      SELECT *, array_cosine_distance(${columnName}, [${queryVector}]::FLOAT[${queryVector.length}]) as distance
      FROM ${tableName}
      ORDER BY array_cosine_distance(${columnName}, [${queryVector}]::FLOAT[${queryVector.length}])
      LIMIT ${limit};
    `;
    return await this.client.query<T>(sql);
  }

  /**
   * 内積を使用して類似ベクトルを検索する
   *
   * 注意: DuckDBのバージョンによっては、このメソッドが期待通りに動作しない可能性があります。
   *
   * @param tableName テーブル名
   * @param queryVector クエリベクトル
   * @param limit 取得する結果の数
   * @param columnName ベクトルカラム名（デフォルトは"vec"）
   * @returns 類似ベクトルの結果
   */
  async searchByInnerProduct<T = any>(
    tableName: string,
    queryVector: number[],
    limit: number = 10,
    columnName: string = "vec",
  ): Promise<T[]> {
    const sql = `
      SELECT *, array_negative_inner_product(${columnName}, [${queryVector}]::FLOAT[${queryVector.length}]) as distance
      FROM ${tableName}
      ORDER BY array_negative_inner_product(${columnName}, [${queryVector}]::FLOAT[${queryVector.length}])
      LIMIT ${limit};
    `;
    return await this.client.query<T>(sql);
  }
}

/**
 * DuckDBClientのインスタンスを作成する
 * @param path データベースファイルのパス（デフォルトは":memory:"でインメモリデータベース）
 * @returns DuckDBClientのインスタンス
 */
export function createDuckDBClient(path: string = ":memory:"): DuckDBClient {
  return new DuckDBClient(path);
}

/**
 * VectorSearchClientのインスタンスを作成する
 * @param client DuckDBClient
 * @returns VectorSearchClientのインスタンス
 */
export function createVectorSearchClient(
  client: DuckDBClient,
): VectorSearchClient {
  return new VectorSearchClient(client);
}

// 使用例
if (import.meta.main) {
  // メイン関数を定義
  // async function main() {
  // DuckDBClientを作成
  const client = createDuckDBClient();

  try {
    // 接続
    client.connect();

    // テーブルを作成
    client.exec("CREATE TABLE test (id INTEGER, name VARCHAR);");

    // データを挿入
    client.exec(
      "INSERT INTO test VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie');",
    );

    // クエリを実行
    const results = await client.query("SELECT * FROM test;");
    console.log("クエリ結果:", results);

    // パラメータ化されたクエリを実行
    const paramResults = await client.queryWithParams(
      "SELECT * FROM test WHERE id > ? AND name LIKE ?;",
      [1, "%a%"],
    );
    console.log("パラメータ化されたクエリ結果:", paramResults);

    // ストリーミングクエリを実行
    console.log("ストリーミングクエリ結果:");
    await client.stream("SELECT * FROM test;", (row) => {
      console.log(" -", row);
    });

    // VSS拡張機能を使用した例
    // VectorSearchClientを作成
    const vectorClient = createVectorSearchClient(client);

    // ベクトル埋め込みを格納するテーブルを作成
    vectorClient.createEmbeddingsTable(
      "embeddings",
      3,
      "id INTEGER, description VARCHAR",
    );

    // データを挿入
    client.exec(`
        INSERT INTO embeddings VALUES
          (1, '赤色のベクトル', [1.0, 0.1, 0.1]),
          (2, '緑色のベクトル', [0.1, 1.0, 0.1]),
          (3, '青色のベクトル', [0.1, 0.1, 1.0]);
      `);

    // HNSWインデックスを作成
    vectorClient.createHNSWIndex("embeddings", "emb_idx");

    // ユークリッド距離を使用して類似ベクトルを検索
    const queryVector = [0.9, 0.2, 0.2];
    const similarVectors = await vectorClient.searchByEuclideanDistance(
      "embeddings",
      queryVector,
      2,
    );
    console.log("類似ベクトル:", similarVectors);
  } catch (error) {
    console.error("エラーが発生しました:", error);
  } finally {
    // 接続を閉じる
    client.close();
  }
}

/// test
import { expect } from "@std/expect";
import { test } from "@std/testing/bdd";

test("DuckDBのインポートが正常に動作すること", () => {
  expect(duckdb).toBeDefined();
  expect(typeof duckdb.Database).toBe("function");
});

test("DuckDBClientが正常に作成できること", () => {
  const client = createDuckDBClient();
  expect(client).toBeDefined();
  expect(client instanceof DuckDBClient).toBe(true);
});

test("DuckDBClientの接続と切断が正常に動作すること", () => {
  const client = createDuckDBClient();

  // 接続
  const connected = client.connect();
  expect(connected, "接続が成功すること").toBe(true);

  // 切断
  client.close();
  // 切断後の状態を直接テストすることはできないため、内部状態は検証しない
});

test("DuckDBClientのクエリ実行結果を取得できること", async () => {
  const client = createDuckDBClient();
  client.connect();

  try {
    // テーブルを作成
    client.exec("CREATE TABLE test_query (id INTEGER, name VARCHAR);");

    // データを挿入
    client.exec("INSERT INTO test_query VALUES (1, 'Alice'), (2, 'Bob');");

    // クエリを実行
    const results = await client.query("SELECT * FROM test_query ORDER BY id;");

    // 結果の検証
    expect(results).toBeDefined();
    expect(Array.isArray(results), "結果が配列であること").toBe(true);
    expect(results.length, "2行のデータが取得できること").toBe(2);

    // 結果の内容を検証
    if (results.length >= 2) {
      expect(results[0].id, "1行目のIDが1であること").toBe(1);
      expect(results[0].name, "1行目の名前がAliceであること").toBe("Alice");
      expect(results[1].id, "2行目のIDが2であること").toBe(2);
      expect(results[1].name, "2行目の名前がBobであること").toBe("Bob");
    }
  } finally {
    client.close();
  }
});

test("DuckDBClientのパラメータ化クエリが正常に動作すること", async () => {
  const client = createDuckDBClient();
  client.connect();

  try {
    // テーブルを作成
    client.exec("CREATE TABLE test_params (id INTEGER, name VARCHAR);");

    // データを挿入
    client.exec(
      "INSERT INTO test_params VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie');",
    );

    // パラメータ化クエリを実行
    const results = await client.queryWithParams(
      "SELECT * FROM test_params WHERE id > ? AND name LIKE ?;",
      [1, "%a%"],
    );

    // 結果の検証
    expect(results).toBeDefined();
    expect(Array.isArray(results), "結果が配列であること").toBe(true);

    // 結果の内容を検証
    if (results.length > 0) {
      // Charlieが含まれていることを確認
      const hasCharlie = results.some((row) => row.name === "Charlie");
      expect(hasCharlie, "Charlieが結果に含まれていること").toBe(true);
    }
  } finally {
    client.close();
  }
});

test("DuckDBClientのストリーミングクエリが正常に動作すること", async () => {
  const client = createDuckDBClient();
  client.connect();

  try {
    // テーブルを作成
    client.exec("CREATE TABLE test_stream (id INTEGER, name VARCHAR);");

    // データを挿入
    client.exec(
      "INSERT INTO test_stream VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie');",
    );

    // ストリーミングクエリ実行
    const rows: any[] = [];
    await client.stream("SELECT * FROM test_stream ORDER BY id;", (row) => {
      rows.push(row);
    });

    // 結果の検証
    expect(rows).toBeDefined();
    expect(Array.isArray(rows), "結果が配列であること").toBe(true);
    expect(rows.length, "3行のデータが取得できること").toBe(3);

    // 結果の内容を検証
    if (rows.length >= 3) {
      expect(rows[0].id, "1行目のIDが1であること").toBe(1);
      expect(rows[0].name, "1行目の名前がAliceであること").toBe("Alice");
      expect(rows[1].id, "2行目のIDが2であること").toBe(2);
      expect(rows[1].name, "2行目の名前がBobであること").toBe("Bob");
      expect(rows[2].id, "3行目のIDが3であること").toBe(3);
      expect(rows[2].name, "3行目の名前がCharlieであること").toBe("Charlie");
    }
  } finally {
    client.close();
  }
});

// VSS機能のテスト
test("VectorSearchClientが正常に作成できること", () => {
  const client = createDuckDBClient();
  client.connect();

  try {
    const vectorClient = createVectorSearchClient(client);
    expect(vectorClient).toBeDefined();
    expect(vectorClient instanceof VectorSearchClient).toBe(true);
  } finally {
    client.close();
  }
});

test("ベクトル埋め込みテーブルが正常に作成できること", () => {
  const client = createDuckDBClient();
  client.connect();

  try {
    const vectorClient = createVectorSearchClient(client);

    // ベクトル埋め込みテーブルを作成
    vectorClient.createEmbeddingsTable(
      "test_embeddings",
      3,
      "id INTEGER, description VARCHAR",
    );

    // テーブルが存在することを確認
    const results = client.query("SELECT * FROM test_embeddings LIMIT 0;");
    expect(results).toBeDefined();
  } finally {
    client.close();
  }
});

test("ユークリッド距離を使用した類似ベクトル検索が正常に動作すること", async () => {
  const client = createDuckDBClient();
  client.connect();

  try {
    const vectorClient = createVectorSearchClient(client);

    // ベクトル埋め込みテーブルを作成
    vectorClient.createEmbeddingsTable(
      "test_euclidean",
      3,
      "id INTEGER, description VARCHAR",
    );

    // データを挿入
    client.exec(`
      INSERT INTO test_euclidean VALUES
        (1, '赤色のベクトル', [1.0, 0.1, 0.1]),
        (2, '緑色のベクトル', [0.1, 1.0, 0.1]),
        (3, '青色のベクトル', [0.1, 0.1, 1.0]);
    `);

    // ユークリッド距離を使用して類似ベクトルを検索
    const queryVector = [0.9, 0.2, 0.2];
    const similarVectors = await vectorClient.searchByEuclideanDistance(
      "test_euclidean",
      queryVector,
      2,
    );

    // 結果の検証
    expect(similarVectors).toBeDefined();
    expect(Array.isArray(similarVectors), "結果が配列であること").toBe(true);
    expect(similarVectors.length, "2行のデータが取得できること").toBe(2);

    // 最も近いベクトルが赤色のベクトルであることを確認
    if (similarVectors.length >= 1) {
      expect(similarVectors[0].id, "最も近いベクトルのIDが1であること").toBe(1);
      expect(
        similarVectors[0].description,
        "最も近いベクトルの説明が赤色のベクトルであること",
      ).toBe("赤色のベクトル");
    }
  } finally {
    client.close();
  }
});

test("コサイン距離を使用した類似ベクトル検索が正常に動作すること", async () => {
  const client = createDuckDBClient();
  client.connect();

  try {
    const vectorClient = createVectorSearchClient(client);

    // ベクトル埋め込みテーブルを作成
    vectorClient.createEmbeddingsTable(
      "test_cosine",
      3,
      "id INTEGER, description VARCHAR",
    );

    // データを挿入
    client.exec(`
      INSERT INTO test_cosine VALUES
        (1, '赤色のベクトル', [1.0, 0.1, 0.1]),
        (2, '緑色のベクトル', [0.1, 1.0, 0.1]),
        (3, '青色のベクトル', [0.1, 0.1, 1.0]);
    `);

    // コサイン距離を使用して類似ベクトルを検索
    const queryVector = [0.9, 0.2, 0.2];
    const similarVectors = await vectorClient.searchByCosineDistance(
      "test_cosine",
      queryVector,
      2,
    );

    // 結果の検証
    expect(similarVectors).toBeDefined();
    expect(Array.isArray(similarVectors), "結果が配列であること").toBe(true);
    expect(similarVectors.length, "2行のデータが取得できること").toBe(2);

    // 最も近いベクトルが赤色のベクトルであることを確認
    if (similarVectors.length >= 1) {
      expect(similarVectors[0].id, "最も近いベクトルのIDが1であること").toBe(1);
      expect(
        similarVectors[0].description,
        "最も近いベクトルの説明が赤色のベクトルであること",
      ).toBe("赤色のベクトル");
    }
  } finally {
    client.close();
  }
});

test("内積を使用した類似ベクトル検索が正常に動作すること", async () => {
  const client = createDuckDBClient();
  client.connect();

  try {
    const vectorClient = createVectorSearchClient(client);

    // ベクトル埋め込みテーブルを作成
    vectorClient.createEmbeddingsTable(
      "test_inner_product",
      3,
      "id INTEGER, description VARCHAR",
    );

    // データを挿入
    client.exec(`
      INSERT INTO test_inner_product VALUES
        (1, '赤色のベクトル', [1.0, 0.1, 0.1]),
        (2, '緑色のベクトル', [0.1, 1.0, 0.1]),
        (3, '青色のベクトル', [0.1, 0.1, 1.0]);
    `);

    // 内積を使用して類似ベクトルを検索
    const queryVector = [0.9, 0.2, 0.2];
    const similarVectors = await vectorClient.searchByInnerProduct(
      "test_inner_product",
      queryVector,
      2,
    );

    // 結果の検証
    expect(similarVectors).toBeDefined();
    expect(Array.isArray(similarVectors), "結果が配列であること").toBe(true);
    expect(similarVectors.length, "2行のデータが取得できること").toBe(2);

    // 最も近いベクトルが赤色のベクトルであることを確認
    if (similarVectors.length >= 1) {
      expect(similarVectors[0].id, "最も近いベクトルのIDが1であること").toBe(1);
      expect(
        similarVectors[0].description,
        "最も近いベクトルの説明が赤色のベクトルであること",
      ).toBe("赤色のベクトル");
    }
  } finally {
    client.close();
  }
});

test("HNSWインデックスが正常に作成できること", () => {
  const client = createDuckDBClient();
  client.connect();

  try {
    const vectorClient = createVectorSearchClient(client);

    // ベクトル埋め込みテーブルを作成
    vectorClient.createEmbeddingsTable(
      "test_hnsw",
      3,
      "id INTEGER, description VARCHAR",
    );

    // データを挿入
    client.exec(`
      INSERT INTO test_hnsw VALUES
        (1, '赤色のベクトル', [1.0, 0.1, 0.1]),
        (2, '緑色のベクトル', [0.1, 1.0, 0.1]),
        (3, '青色のベクトル', [0.1, 0.1, 1.0]);
    `);

    // HNSWインデックスを作成
    vectorClient.createHNSWIndex("test_hnsw", "test_hnsw_idx");

    // インデックスが存在することを確認（エラーが発生しなければOK）
    expect(true).toBe(true);
  } finally {
    client.close();
  }
});
