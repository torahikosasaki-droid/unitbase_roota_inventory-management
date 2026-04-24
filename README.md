# unitbase_roota_inventory-management

IMEI端末の持ち出し・販売・返却を管理する在庫管理システム。

## 技術スタック

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Google Sheets API（在庫データの双方向連携）
- @zxing/browser（IMEIバーコードスキャン）

## セットアップ

```bash
npm install
cp .env.local.example .env.local
# .env.local にスプレッドシートIDとサービスアカウントJSONを設定
npm run dev
```
