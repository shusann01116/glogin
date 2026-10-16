# glogin

`gcloud auth login --update-adc` を、パスキーの OS ダイアログを承認するだけで終わらせるスクリプト。

## 何が自動で、何が手動か

| 画面 | 操作 |
| --- | --- |
| アカウント選択 | 自動 |
| 1Password の「Use a security key or another passkey」 | 自動 |
| OS のパスキーダイアログ | 手動（本人確認のため残している） |
| 同意画面 | 自動 |

## 前提

- macOS と Google Chrome
- Node.js（mise 管理のもので動作確認した）
- gcloud CLI と、`gcloud config get account` で取得できる設定済みのアカウント
- 1Password（パスキーを保存したもの）

## セットアップ

```sh
git clone https://github.com/shusann01116/glogin.git ~/.local/share/glogin
cd ~/.local/share/glogin
npm ci
ln -s ~/.local/share/glogin/glogin ~/.local/bin/glogin
glogin --setup   # 専用プロファイルの Chrome で 1Password 拡張のページが開く
```

開いた Chrome で 1Password 拡張を追加してサインインし、ウィンドウを閉じる。

clone 先は `~/.local/share/glogin` に固定している（`glogin` がこのパスを参照するため）。`~/.local/bin` は PATH に入っている前提で、入っていなければ PATH の通った別の場所にリンクを置く。

## 使い方

```sh
glogin                  # gcloud auth login --update-adc
glogin --no-activate    # 追加の引数は gcloud auth login にそのまま渡る
```

## 仕組み

gcloud はログイン URL を `BROWSER` 環境変数のコマンドで開く。`glogin` はこの変数に自分自身を指定して gcloud を起動し、呼び返されたら `glogin.mjs` をバックグラウンドで起動してすぐに終了する。gcloud はブラウザを起動したコマンドの終了を待ってから redirect を受け付けるため、ここで終了しないと処理が止まる。

`glogin.mjs` は Playwright で専用プロファイルの Chrome を起動し、上の表の自動操作を行う。localhost への redirect を確認したら Chrome を閉じる。5 分経っても終わらない場合も Chrome を閉じ、`glogin.log` に `timeout` と記録する。
## ファイル

| パス | 内容 | git 管理 |
| --- | --- | --- |
| `glogin` | 入口のシェルスクリプト。gcloud の起動と、ブラウザ役として呼び返されたときの処理 | する |
| `glogin.mjs` | ブラウザ操作の本体 | する |
| `profile/` | Chrome プロファイル（Google のセッション Cookie、1Password 拡張の状態） | しない |
| `glogin.log` | 画面遷移とクリックの記録（URL のクエリは除去） | しない |

## 既知の制約

- Google のセッションが切れたときに表示されるメール入力画面は自動化していない。手で入力すれば先に進む。
- Google や 1Password の画面の文言・DOM が変わると自動クリックが止まる。止まった画面を手で操作すれば完了する。止まった箇所は `glogin.log` で確認できる。
