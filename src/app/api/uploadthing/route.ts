import { createUploadthing, type FileRouter } from "uploadthing/next";
import { createRouteHandler } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { requireRole } from "@/lib/auth/session";

const f = createUploadthing();

const archiveFileRouter = {
  archiveDocumentUploader: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
    "text/csv": { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      try {
        const user = await requireRole(["COORDINATOR", "ADMIN"]);
        return {
          userId: user.id,
          departmentId: user.departmentId ?? "cm0deptbscs00000000000001",
        };
      } catch {
        throw new UploadThingError("Only FYP Coordinators and University Admins can upload archive documents.");
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        fileUrl: file.ufsUrl,
        fileName: file.name,
      };
    }),
} satisfies FileRouter;

export type ArchiveFileRouter = typeof archiveFileRouter;

export const { GET, POST } = createRouteHandler({
  router: archiveFileRouter,
});
