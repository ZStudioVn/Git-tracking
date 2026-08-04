# Upgrade Time 1 — MVP completion

Mục tiêu: nối các feature hiện có thành một workflow MVP hoàn chỉnh: connect repository → sync → chọn branch/commit → duyệt tree → xem commit detail/file history → compare và xem diff.

## Progress

- [x] Tạo checklist nâng cấp và xác định thứ tự triển khai.
- [x] Làm sync job chạy được từ manual trigger và có retry an toàn.
- [x] Bổ sung scheduled polling entrypoint cho cron.
- [x] Đồng bộ tags và xác thực dữ liệu branch/tag/PR.
- [x] Làm branch selector và branch-aware commit history.
- [x] Lưu quan hệ branch ↔ commit để lọc DAG theo branch.
- [x] Sync commit DAG và changed-file metadata cho toàn bộ branch.
- [x] Nối file tree vào dashboard theo revision.
- [x] Tạo commit detail route và changed-file navigation.
- [x] Nối file history ở mức MVP bằng GitHub path history API.
- [ ] Blame on-demand (cần GitHub GraphQL contract và UI line annotations).
- [x] Hoàn thiện diff workspace dùng chung từ commit/tree flow.
- [ ] Cập nhật tài liệu scope/progress và kiểm tra type/lint/build.

## Validation status

- `git diff --check`: pass.
- `npm run typecheck`, lint, build: chưa chạy được vì `node_modules` chưa tồn tại.
- Runtime OAuth/PostgreSQL/GitHub: chưa xác thực, cần môi trường theo `SETUP_INSTRUCTION.md`.

## Thứ tự và lý do

1. Sync/data integrity: UI không thể đáng tin nếu dữ liệu chưa import hoặc job chỉ nằm ở trạng thái PENDING.
2. Navigation primitives: branch, commit detail và tree tạo thành context chung cho mọi màn hình.
3. Diff: dùng lại commit/tree context để tránh duplicate flow.
4. Validation/documentation: chốt các giới hạn MVP và ghi lại kết quả kiểm tra.

## Giới hạn đợt này

File history được triển khai theo GitHub on-demand với giới hạn 50 commit/file. Blame line-level, webhook, multi-repository, AI, analytics và review workflow vẫn ngoài MVP.

## Audit fixes — 2026-08-04

Đã xử lý 8 nhóm lỗi phát hiện trong audit MVP:

1. **Commit DAG integrity** — import commit trước, sau đó mới backfill `CommitParent`, tránh mất parent khi GitHub trả commit theo thứ tự mới nhất trước.
2. **Branch membership** — tạo/backfill `BranchCommit` cho commit đã tồn tại trong các batch traversal thực tế; không gán toàn bộ repository vào branch khi GitHub trả về zero commit.
3. **Deleted branches** — thêm `Branch.deletedAt`, đánh dấu branch không còn trên GitHub và khôi phục branch nếu xuất hiện lại.
4. **Job race/duplicates** — claim job bằng điều kiện atomic `id + status=PENDING`; thêm unique partial index chỉ cho phép một job `PENDING/RUNNING` trên mỗi repository.
5. **Retry policy** — thêm `SyncJob.availableAt`, retry exponential backoff và bỏ retry cho lỗi auth/token cố định.
6. **Tree/file navigation** — dùng full path của node, không ghép path lặp; click file mở `/dashboard/file` và giữ `revision`.
7. **Blob/diff limit** — kiểm tra kích thước patch thực tế, giới hạn 1 MB trước khi trả line diff.
8. **Token/branch/cron operations** — kiểm tra token GitHub hết hạn, thêm cron endpoint bảo vệ bằng `CRON_SECRET`, cấu hình Vercel chạy mỗi 5 phút.

### Migration và validation

- Migration: `prisma/migrations/20260803000000_add_branch_membership_and_job_backoff/migration.sql`.
- Schema đã có `BranchCommit`, `Branch.deletedAt`, `SyncJob.availableAt`.
- `git diff --check`: **pass**.
- Typecheck/lint/build/runtime chưa chạy được trong môi trường audit vì thiếu `node_modules`, pnpm, PostgreSQL và OAuth credentials.

### Cách chạy sau khi cài môi trường

```bash
pnpm install
pnpm prisma migrate deploy
pnpm prisma generate
pnpm typecheck
pnpm lint
pnpm build
```

Cần cấu hình `CRON_SECRET` để Vercel Cron gọi `/api/cron/sync`.