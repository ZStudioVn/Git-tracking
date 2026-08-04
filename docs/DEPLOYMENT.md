# Quy trình Đóng gói, Build & Triển khai

Hướng dẫn chuẩn để build, đóng gói desktop app, triển khai và đẩy thay đổi lên GitHub.
Áp dụng cho repo `ZStudioVn/Git-tracking`. Package manager chính thức: **npm** (`package-lock.json` đã commit).

---

## 1. Kiến trúc triển khai

| Mode | Mô tả | Khi nào dùng |
|---|---|---|
| **Desktop (local-first)** | Electron shell bọc Next.js UI; native folder picker; Git chạy trên máy người dùng qua IPC | Mặc định — mỗi người dùng cài app trên máy riêng, không cần server chung |
| **Web (browser-only)** | Next.js chạy trên localhost; nhập đường dẫn thủ công; cần PostgreSQL | Fallback khi chưa cài Electron |

Chuỗi chạy khi packaged:
`Electron main → spawn "next start -p 3100" → load http://127.0.0.1:3100`

Quy tắc bảo mật cốt lõi: web app **không bao giờ** chạy lệnh shell tùy ý. Lệnh git thật chỉ chạy trong Electron qua IPC `git:run` với **whitelist 11 lệnh** và chỉ trên project đã đăng ký.

---

## 2. Chuẩn bị môi trường (lần đầu)

**Yêu cầu:** Node.js 20+, Git binary (trên PATH), PostgreSQL 16.

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file env
cp .env.example .env
#   Điền: DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32),
#         ENCRYPTION_KEY (openssl rand -base64 32),
#         GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET (GitHub OAuth App),
#         CRON_SECRET, LOCAL_PROJECT_ACCESS=true

# 3. Khởi động PostgreSQL (Docker)
docker compose up -d postgres

# 4. Áp dụng migration (tạo bảng GitConfig, LocalProject, cột ahead/behind)
npx prisma migrate dev
npx prisma generate
```

> Mọi migration trong `prisma/migrations/` **bắt buộc commit** vào git — người khác cần chúng để migrate đúng schema.

---

## 3. Build web (production)

```bash
npm run lint          # ESLint — phải 0 warning
npm run typecheck     # TypeScript strict — phải pass
npm run build         # next build → .next/
```

Kiểm tra nhanh: `npm start` rồi mở `http://localhost:3000`.

**Bắt buộc** chạy `npm run build` trước khi đóng gói desktop (electron-builder cần `.next/`).

---

## 4. Đóng gói desktop (Electron)

```bash
# Bước 1: biên dịch main process + preload → dist-electron/
npm run desktop:compile

# Bước 2: đóng gói installer theo hệ điều hành
npx electron-builder --win     # Windows (NSIS, .exe)
npx electron-builder --mac     # macOS (.dmg) — chỉ chạy được trên macOS
npx electron-builder --linux   # Linux (AppImage + .deb)
```

Cấu hình `electron-builder.yml`:
- `files`: `dist-electron/**` + `.next/**` + `package.json`
- `main`: `dist-electron/main.js` (đã khai báo trong `package.json`)
- Installer nằm trong thư mục `dist/` (đã có trong `.gitignore`)

**Trình tự đúng (từ máy sạch):**
```bash
npm install
npm run build          # tạo .next
npm run desktop:compile
npx electron-builder --win
```

---

## 5. Triển khai

### 5.1 Local-first (mặc định)
Không có server chung. Giao installer cho người dùng; họ cài và dùng trực tiếp trên máy.

### 5.2 Web trên VPS (tùy chọn)
1. Cài Node 20+, PostgreSQL, Git trên VPS.
2. Clone repo, `npm ci`, tạo `.env` production.
3. `npx prisma migrate deploy` (không dùng `migrate dev` trên production).
4. `npm run build && npm start` (Next.js tự bật HSTS + security headers ở production).
5. Đặt sau reverse proxy (Caddy/Nginx) với HTTPS bắt buộc.
6. `LOCAL_PROJECT_ACCESS=true` chỉ khi muốn đọc folder trên chính máy đó; endpoint có guard localhost.

> Không bao giờ chạy `npm run dev` trên production.

---

## 6. Quy trình đẩy thay đổi lên GitHub

### 6.1 Trước khi commit
```bash
git status                # xem thay đổi
git diff                  # xem nội dung
git diff --check          # phát hiện whitespace error
```

### 6.2 Commit theo module (KHÔNG gộp 1 commit khổng lồ)
Chia theo: tooling/build, database, API/lib, UI/components, docs.

```bash
# Ví dụ
git add package.json package-lock.json electron-builder.yml electron/ .gitignore
git commit -m "build: add electron packaging config and npm lockfile"

git add prisma/
git commit -m "feat(db): add GitConfig, LocalProject models and migrations"

git add src/app/api/ src/lib/ src/middleware.ts
git commit -m "feat(api): add git config, commit, commands and local-projects routes"

git add src/app/dashboard/ src/components/ src/app/layout.tsx src/app/page.tsx
git commit -m "feat(ui): add dashboard tabs, local project detail, toast and command center"

git add docs/ README.md CHANGELOG.md SECURITY.md
git commit -m "docs: add deployment guide and update project status"
```

### 6.3 Push
```bash
git push origin main
```

- Nếu origin còn commit cũ mà local chưa có: `git pull --rebase origin main` rồi push lại.
- Cấm `git push --force` thường; nếu bắt buộc thì dùng `--force-with-lease`.

### 6.4 Lần đầu với repo chưa có commit local
```bash
git remote -v                 # xác nhận origin trỏ đúng
git pull --rebase origin main # nếu origin/main có sẵn nội dung
git push -u origin main
```

---

## 7. Troubleshooting

| Lỗi | Nguyên nhân | Xử lý |
|---|---|---|
| `prisma validate` báo thiếu `DATABASE_URL` | Không có `.env` | Tạo `.env` từ `.env.example` (validate không cần DB chạy, chỉ cần env) |
| electron-builder "ENOENT .next" | Chưa `npm run build` | Chạy build web trước |
| Desktop mở trang trắng | `next start` chưa kịp mở cổng 3100 | Đợi 1-2s hoặc kiểm tra log; port 3100 bị chiếm thì đổi `APP_PORT` trong `electron/main.ts` |
| `git` not found khi thêm project | Git không có trên PATH | Cài Git for Windows và mở lại app |
| `npm audit` lỗi `ENOLOCK` | Thiếu lockfile | Đã commit `package-lock.json`; chạy `npm install` để cập nhật |
| Migration không áp dụng | Quên `prisma migrate dev` | Chạy migrate; kiểm tra `prisma/migrations/` có commit chưa |

---

## 8. Checklist trước khi release

 - [x] `npm run lint` pass
 - [x] `npm run typecheck` pass
 - [ ] `npm run build` pass — cần `DATABASE_URL` hợp lệ
 - [ ] `git diff --check` sạch — kiểm tra trước release
 - [x] `.env` không bị commit (đã trong `.gitignore`)
 - [ ] `dist/`, `.next/`, `node_modules/`, `dist-electron/` không bị commit — kiểm tra trước release
 - [ ] Migration mới nhất đã commit
