# Plan: Lấy UI từ Circle và Tổ chức lại Git-tracking

**Ngày tạo:** 2026-08-21
**Trạng thái:** Đang chờ thực hiện
**Mục tiêu:** Xây dựng giao diện người dùng cho Git-tracking lấy cảm hứng từ ln-dev7/circle, tích hợp với logic Git hiện có và chuẩn bị cho các tính năng mở rộng (CI/CD, VPS, tracking đa hệ thống).

---

## 1. Phân tích Circle (ln-dev7/circle)

**Bước 1: Clone và phân tích**
```bash
git clone https://github.com/ln-dev7/circle.git ../circle-reference
```

**Cần phân tích:**
- Cấu trúc components (shadcn/ui)
- Layout (sidebar, header, main content)
- Màu sắc, typography, spacing
- Các page: issues, projects, teams, inbox
- State management (store/ folder)
- Routing (Next.js App Router)

**Kết quả mong đợi:** Tài liệu mô tả các thành phần UI chính, cách tổ chức code, và danh sách các component có thể tái sử dụng.

---

## 2. Thiết kế UI cho Git-tracking

**Nguyên tắc:**
- **Không copy code** – chỉ copy ý tưởng và thiết kế.
- **Tích hợp với logic Git hiện có** – dữ liệu từ isomorphic-git và GitHub API.
- **Permalinks (D-08)** – mọi screen đều có URL riêng.
- **Responsive** – hỗ trợ desktop và web (Electron).

**Các màn hình chính:**

### 2.1. Dashboard tổng quan
- **Sidebar trái:** Danh sách repository (local và GitHub), branches, tags.
- **Header:** Tên repo, branch hiện tại, sync status, nút manual sync.
- **Main:** Commit graph (visx), thống kê nhanh (số commit, branch, PR).

### 2.2. Commit Graph
- **Biểu đồ lanes** – sử dụng visx hoặc gitgraph-js (D-06).
- **Click vào commit** → xem chi tiết (message, files changed, diff).
- **Permalink:** `/dashboard/repo/[owner]/[name]/commit/[sha]`

### 2.3. File Tree
- **Hiển thị cây thư mục** theo revision (commit/branch/tag).
- **Lazy load** các folder con.
- **Click vào file** → xem nội dung hoặc blame/history.

### 2.4. Diff Workspace
- **Chọn base và head** (commit, branch, tag).
- **Changed-file tree** – nhóm theo trạng thái (modified, added, deleted, renamed).
- **Side-by-side diff** (react-diff-view) hoặc unified.
- **Permalink:** `/dashboard/repo/[owner]/[name]/diff?base=...&head=...`

### 2.5. Blame & File History
- **Blame:** Hiển thị từng dòng với tác giả, commit SHA.
- **File History:** Danh sách commit ảnh hưởng đến file đó.

### 2.6. Sync Status
- **Badge** hiển thị trạng thái (synced, syncing, error).
- **Timestamp** lần sync cuối.
- **Nút retry** cho lần sync thất bại.

---

## 3. Cập nhật Plan (PROGRESS.md)

**Cần thêm/bổ sung:**

### Phase 2 – Git Navigation (UI)
- [ ] Tạo layout dashboard (sidebar + header)
- [ ] Commit graph với visx
- [ ] File tree với lazy loading
- [ ] Breadcrumb: `branch > commit > folder > file`

### Phase 3 – Diff Workspace (UI)
- [ ] Diff viewer (side-by-side + unified)
- [ ] Changed-file tree
- [ ] Blame annotations
- [ ] File history view

### Phase 4 – Sync & Automation (UI)
- [ ] Sync status widget
- [ ] Retry button
- [ ] Sync timeline / log viewer

### Phase 5 – Workflow Intelligence (UI)
- [ ] PR/issue grouping
- [ ] Release reports
- [ ] Search

---

## 4. Rules cho AI và Dev

### AI Rules (`.sisyphus/rules/ai-rules.md`)
- Luôn đọc `docs/PROGRESS.md` trước khi code.
- Không dùng `any`, `@ts-ignore`, `@ts-expect-error`.
- Commit message theo [Conventional Commits](https://www.conventionalcommits.org/).
- Chạy `pnpm typecheck && pnpm lint && pnpm test` trước khi commit (hoặc yêu cầu CI).
- Khi sửa UI, ưu tiên dùng shadcn/ui components và Tailwind CSS.
- Đảm bảo mọi screen đều có permalink (D-08).

### Dev Rules (`.sisyphus/rules/dev-rules.md`)
- Code review bắt buộc cho mọi PR.
- PR title: `[Phase-X] Description` (ví dụ: `[Phase-2] Commit graph with visx`).
- Test coverage > 70%.
- Cập nhật `CHANGELOG.md` cho mỗi PR (theo Keep a Changelog).
- Branch naming: `feature/phase-X-description` (ví dụ: `feature/phase-2-commit-graph`).
- Mỗi PR phải có checklist:
  - [ ] Code đã chạy typecheck, lint, test.
  - [ ] Không có `any`, `@ts-ignore`.
  - [ ] Có permalink cho screen mới.
  - [ ] Cập nhật PROGRESS.md (đánh dấu task hoàn thành).

---

## 5. Quy trình làm việc (Flow)

1. **Pick task** từ `PROGRESS.md` (ưu tiên Phase 2).
2. **Tạo branch:** `feature/phase-X-description`.
3. **Implement** + test + lint.
4. **Tạo PR** với checklist.
5. **Review** (bởi ít nhất 1 người).
6. **Merge** → update `PROGRESS.md` (đánh dấu ✅).
7. **Commit** với message theo Conventional Commits.
8. **Deploy** (nếu có staging).

---

## 6. Timeline dự kiến

| Ngày | Task | Người thực hiện |
|------|------|-----------------|
| 2026-08-21 | Tạo plan, rules, update PROGRESS.md | Sisyphus (AI) |
| 2026-08-22 | Clone Circle, phân tích UI | Sisyphus (AI) |
| 2026-08-23 | Tạo layout dashboard (sidebar + header) | AI (visual-engineering) |
| 2026-08-24 | Commit graph với visx | AI (deep) |
| 2026-08-25 | File tree + lazy loading | AI (deep) |
| 2026-08-26 | Diff viewer cơ bản | AI (deep) |
| 2026-08-27 | Blame + file history | AI (deep) |
| 2026-08-28 | Review + fix bugs | Sisyphus + team |
| 2026-08-29 | Tích hợp sync status UI | AI (deep) |

---

## 7. Lưu ý khi thực hiện

- **Ưu tiên Phase 2 trước** (commit graph + file tree) vì đây là core navigation.
- **Không implement CI/CD hay multi-repo ngay** – tập trung vào UI và logic Git hiện có.
- **Giữ nguyên kiến trúc** – không phá vỡ tách biệt core và UI.
- **Sử dụng shadcn/ui** – thêm các component mới qua `npx shadcn-ui@latest add`.
- **Test trên cả web và Electron** – đảm bảo chạy được cả hai môi trường.

---

**Ký duyệt:** Sisyphus
**Ngày hết hạn:** 2026-09-15