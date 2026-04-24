# 在庫管理システム

高額商材（SB Air・Pixel・iPhone等）の持ち出し〜販売〜返却サイクルをスマートフォンで一元管理するWebアプリ。スマホカメラでIMEIバーコードをスキャンし、Google Sheetsの在庫表とリアルタイムで双方向連携する。

## 機能一覧

| 画面 | URL | 概要 |
|---|---|---|
| ダッシュボード | `/` | 在庫サマリー・アラート件数・本日の活動を表示 |
| 在庫一覧 | `/inventory` | 全端末のステータスとアラートを確認 |
| 持ち出し登録 | `/inventory/checkout` | バーコードスキャンで持ち出し端末を登録 |
| 販売登録 | `/inventory/sale` | 成約端末のIMEIをスキャンして記録 |
| 返却照合 | `/inventory/return` | 手元端末をスキャンして持ち出し数と照合、紛失検出 |
| 販売実績インポート | `/import` | 外部システムのCSVを取り込み販売日時を一括更新 |
| 管理 | `/admin` | 在庫全件ビュー・アラートスキャン実行 |
| 設定・管理 | `/settings` | ユーザー管理・販売ブース・接続設定・操作ログ |

## アラート自動判定

スプレッドシートの各列をもとに、以下の3パターンを自動検出する。

| アラート | 条件 |
|---|---|
| 紛失の恐れ | 持ち出しフラグ○ かつ 帰り・販売フラグが両方空 |
| 記録ミス | 持ち出し・販売フラグ○ かつ 販売日時（外部連携）が空 |
| 持ち出し記録漏れ | 持ち出しフラグ空 かつ 販売日時あり |

## スプレッドシート構成

| 列 | 項目 | 更新タイミング |
|---|---|---|
| A | No. | — |
| B | IMEI | — |
| C | 持ち出しありフラグ（○） | 持ち出し時・バーコード読み取り |
| D | 持ち出し日時 | 持ち出し時・バーコード読み取り |
| E | 販売ブース | 持ち出し時・手入力 |
| F | 販売ありフラグ（○） | 販売時・バーコード読み取り |
| G | 持ち帰りフラグ（○） | 帰社時・バーコード読み取り |
| H | 販売日時 | 翌日夕方・外部実績CSVインポート |
| I | アラート | システム自動判定 |

## 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + lucide-react |
| バーコードスキャン | @zxing/browser + @zxing/library |
| Google Sheets連携 | googleapis |
| バリデーション | Zod v4 |
| 通知 | Sonner |
| ユーザーデータ | サーバー側 JSON ファイル（`data/`） |

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Google Cloud の設定

1. [Google Cloud Console](https://console.cloud.google.com) でプロジェクトを作成
2. **Google Sheets API** を有効化
3. サービスアカウントを作成し、JSONキーをダウンロード
4. 在庫管理スプレッドシートをサービスアカウントのメールアドレスで **編集者** として共有

### 3. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```bash
# スプレッドシートURLの /d/〇〇〇/ 部分
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id

# スプレッドシート下部のタブ名
GOOGLE_SHEET_NAME=在庫管理

# ダウンロードしたJSONファイルの中身を1行で貼り付け
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

### 4. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` をブラウザで開く。

## 販売実績インポート（CSV）

外部システムの販売実績をCSVで取り込み、スプレッドシートのH列（販売日時）とF列（販売フラグ）を一括更新する。

**CSVフォーマット例：**

```csv
IMEI,販売日時,機種名,担当者
351234567890124,2026/4/24,iPhone 15,田中
352345678901235,2026/4/24,Pixel 8,鈴木
```

- 1行目はヘッダー行
- IMEI列・販売日列はインポート画面でカラム指定可能
- 既に販売日時が登録済みの行はスキップ
- インポート後にアラートを自動再評価

## ディレクトリ構成

```
├── app/
│   ├── page.tsx                  # ダッシュボード
│   ├── admin/                    # 管理画面
│   ├── import/                   # 販売実績インポート
│   ├── inventory/                # 在庫管理（一覧・持ち出し・販売・返却）
│   ├── settings/                 # 設定・管理
│   └── api/                      # APIルート
│       ├── checkout/             # 持ち出し登録
│       ├── sale/                 # 販売登録
│       ├── reconcile/            # 返却照合
│       ├── dashboard/            # ダッシュボード集計
│       ├── import/sales/         # CSVインポート
│       ├── sheets/inventory/     # 在庫一覧・アラートスキャン
│       └── settings/             # ユーザー・ブース・接続設定
├── components/
│   ├── scanner/BarcodeScanner.tsx
│   └── inventory/
│       ├── InventoryTable.tsx
│       └── StockAlert.tsx
├── lib/
│   ├── google-sheets.ts          # Sheets API クライアント
│   ├── imei.ts                   # IMEIバリデーション・Luhnチェック
│   ├── reconcile.ts              # 照合・アラート判定ロジック
│   └── data-store.ts             # JSONファイル読み書き
├── types/inventory.ts            # 型定義
├── data/                         # ユーザー・ブースデータ（gitignore）
└── .env.local.example            # 環境変数テンプレート
```

## 注意事項

- `data/` ディレクトリはGitで管理されない（`.gitignore` 対象）。Vercelにデプロイする場合、ユーザー・ブースデータの永続化にはGoogle Sheetsの専用タブまたは外部DBへの移行が必要
- カメラを使用するバーコードスキャンはHTTPS環境が必要。ローカル開発は `http://localhost` で動作するが、iPhoneからのアクセスにはVercelなどHTTPSホスティングが必要
- `.env.local` はGitにコミットしない
