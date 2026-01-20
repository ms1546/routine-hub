あなたは Next.js + Storybook に精通したシニアフロントエンドエンジニアです。

以下の要件を満たす形で、
Storybook を @storybook/nextjs（Webpack）から
@storybook/nextjs-vite（Vite）へ移行してください。

---

# 🎯 目的

- Storybook のビルドエラー（webpack / tap / base64-js / ttlcache 等）を根本的に解消する
- Storybook の設定を公式推奨構成に寄せる
- アプリケーション本体の挙動・コードには一切影響を与えない

---

# ✅ 前提条件

- Next.js のバージョンは変更しない（※ Storybook 側のみ変更）
- アプリケーションコード（app/, components/, actions 等）は変更しない
- Storybook は UI 開発・確認専用として動作すればよい
- Node.js 専用処理（MCP / Mastra / cache / server-only）は Storybook では実行しない

---

# 🛠️ 作業内容

## 1. パッケージの移行

- @storybook/nextjs を完全に削除する
- @storybook/nextjs-vite を devDependencies に追加する
- Storybook 関連パッケージのバージョンを整合させる

## 2. .storybook/main.ts（または js）の修正

- framework を `@storybook/nextjs-vite` に変更する
- webpackFinal を **完全に削除**する
- webpack 用の alias / loader / plugin 設定はすべて除去する
- 必要な設定は viteFinal に置き換える（最小限）

## 3. Node 専用依存の扱い

- Storybook 実行時に以下を満たすこと：
  - base64-js
  - @isaacs/ttlcache
  - Node built-in（fs, path, crypto 等）
  がブラウザで実行されない

- Node 専用モジュールは：
  - Storybook 側で import されない構成にする
  - または Vite alias によりスタブ化する（最小限）

## 4. Next.js App Router 対応

- next/navigation を使用しているコンポーネントが Storybook で描画できるようにする
- 必要に応じて `parameters.nextjs.appDirectory = true` を設定する
- Router / Navigation は Storybook 標準の mock を使用する

## 5. 動作確認

- `npm run storybook` がエラーなく起動する
- Story が正常に描画される
- 既存の Story の表示結果が変わらない

---

# ❌ やってはいけないこと

- アプリケーションコードを Storybook 都合で書き換えない
- 本番ロジックに mock / if (storybook) を入れない
- 不要な polyfill や workaround を追加しない
- Webpack 設定を残さない

---

# ✅ 完了条件

- Storybook が Vite で起動している
- Webpack 由来のエラーが完全に消えている
- Storybook 設定がシンプルになっている
- 「Storybook のための特別な地獄」が存在しない

---

# 📤 出力形式

- 変更後の `.storybook/main.ts`
- 必要であれば `.storybook/preview.ts`
- 追加・削除した npm パッケージ一覧
- なぜこの構成で問題が解決するのかの簡潔な説明

以上を満たす形で移行を実施してください。
