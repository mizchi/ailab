# AIを活用する際のDenoパーミッションセキュリティガイド

Denoはデフォルトでセキュアな実行環境を提供しますが、AIが生成したコードを実行する際には特に注意が必要です。このドキュメントでは、AIを活用する際のDenoのパーミッション管理と安全なコード実行方法について解説します。

## Denoのセキュリティモデル基本原則

Denoのセキュリティモデルは以下の重要な原則に基づいています：

- **デフォルトでI/Oアクセスなし**:
  ファイルシステム、ネットワーク、環境変数へのアクセスは明示的に許可が必要
- **同じ権限レベルでのコード実行に制限なし**:
  同じ権限内であれば、`eval`、`new Function`、動的インポート、Web
  Workersなどでコードを実行可能
- **同じスレッド上のコードは同じ権限レベルを共有**:
  スレッド内でモジュールごとに異なる権限レベルを持つことはできない
- **ユーザー同意なしに権限昇格不可**:
  明示的な許可がない限り、実行中のコードが権限を昇格させることはできない

## AIコードとパーミッションリスク

AIが生成したコードを実行する際には、以下のリスクに特に注意が必要です：

1. **過剰なパーミッション要求**:
   AIは「動作させるため」に必要以上の広範なパーミッションを要求するコードを生成することがある
2. **隠れた悪意のあるコード**:
   大量のコードの中に、不要なファイルアクセスやネットワーク通信を隠している可能性がある
3. **エスケープ手法**:
   `eval`や動的インポートを使用して権限を昇格させようとする試み

## 安全なパーミッション管理戦略

### 1. 最小権限の原則を徹底する

```bash
# 悪い例（すべての権限を付与）
deno run -A ai_generated_script.ts

# 良い例（必要最小限の権限のみ付与）
deno run --allow-read=data/ --allow-write=output/ ai_generated_script.ts
```

### 2. Denyフラグによる明示的なアクセス制限

特に重要なのが `--deny-*` フラグです。これは `--allow-*`
より優先され、特定のリソースへのアクセスを明示的に拒否します。

```bash
# フォルダ内のすべての読み取りを許可するが、重要なファイルへのアクセスは拒否
deno run --allow-read=./ --deny-read=./secrets.json ai_generated_script.ts

# ネットワークアクセスを許可するが、特定のドメインへのアクセスは拒否
deno run --allow-net --deny-net=internal-api.company.com ai_generated_script.ts
```

### 3. 高リスクな権限の制限

特に以下の権限は慎重に扱うべきです：

#### サブプロセス実行 (`--allow-run`)

```bash
# 悪い例（すべてのサブプロセス実行を許可）
deno run --allow-run ai_generated_script.ts

# 良い例（特定のコマンドのみ許可）
deno run --allow-run=ls,cat ai_generated_script.ts
```

注意: `--allow-run=deno`
は、別のDenoプロセスを起動して権限を昇格させる可能性があるため避けるべきです

#### FFI (`--allow-ffi`)

```bash
# 悪い例（すべての動的ライブラリロードを許可）
deno run --allow-ffi ai_generated_script.ts

# 良い例（特定のライブラリのみ許可）
deno run --allow-ffi=./libsafe.so ai_generated_script.ts
```

### 4. Webからのインポート制限

AIが生成したコードが外部モジュールをインポートする場合、特に注意が必要です。

```bash
# 特定のドメインからのインポートのみ許可
deno run --allow-import=deno.land,jsr.io ai_generated_script.ts
```

デフォルトでは以下のドメインからのインポートが許可されています：

- deno.land
- jsr.io
- esm.sh
- raw.githubusercontent.com
- gist.githubusercontent.com

## AIコード実行のベストプラクティス

### 1. コードの事前確認

AIが生成したコードを実行する前に、以下の点を確認しましょう：

- ファイル操作（読み取り/書き込み）を行う箇所
- ネットワーク通信を行う箇所
- 環境変数にアクセスする箇所
- `eval`や動的インポートを使用している箇所
- サブプロセスを起動する箇所
- FFIを使用する箇所

### 2. 段階的な権限拡大

1. まず最小限の権限で実行してみる
2. 必要に応じて権限を段階的に追加する
3. パーミッションプロンプトを活用する（`--no-prompt` を使わない）

### 3. 実行環境の分離

特に信頼性の低いAIコードを実行する場合：

```bash
# ファイルシステムアクセスを制限した専用ディレクトリで実行
mkdir isolated_env && cd isolated_env
deno run --allow-read=./ --allow-write=./ ../ai_generated_script.ts
```

### 4. 追加のサンドボックス技術の活用

より厳格なセキュリティが必要な場合は、OSレベルのサンドボックスも検討：

- Linux: chroot, cgroups, seccomp
- コンテナ: Docker, Podman
- VM: gVisor, Firecracker

## 権限拒否のためのパターン例

以下に、一般的なユースケースにおける安全なパーミッション設定パターンを紹介します。

### データ分析スクリプト

```bash
deno run \
  --allow-read=./data/ \
  --allow-write=./results/ \
  --deny-net \
  --deny-run \
  --deny-env \
  --deny-ffi \
  ai_data_analysis.ts
```

### Webスクレイピングスクリプト

```bash
deno run \
  --allow-net=example.com,api.example.org \
  --allow-write=./scraped_data/ \
  --deny-read=/etc,/home,/usr \
  --deny-run \
  --deny-env \
  --deny-ffi \
  ai_web_scraper.ts
```

### CLIユーティリティ

```bash
deno run \
  --allow-read=./ \
  --allow-write=./ \
  --allow-run=ls,cat,grep \
  --deny-net \
  --deny-env=AWS_*,SECRET_* \
  --deny-ffi \
  ai_cli_tool.ts
```

## まとめ

AIが生成したコードを安全に実行するためには：

1. 最小権限の原則を徹底する
2. Denyフラグで明示的に重要なリソースを保護する
3. コード実行前に内容を確認する
4. 段階的に権限を付与し、不要な権限は与えない
5. 必要に応じて追加のサンドボックス技術を活用する

これらの原則を守ることで、AIの力を最大限に活用しながら、システムとデータの安全性を保つことができます。
