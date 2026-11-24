import { test, expect } from "@playwright/test";

test.describe("ProjectCompass E2E Golden Path & RBAC Verification", () => {
  test("Student golden path: landing -> clean sign-in -> skill profile -> 3-track recommendations -> roadmap & markdown export", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /Final-Year Project Evaluation, Archive Verification & Faculty Supervision Portal/i,
      })
    ).toBeVisible();

    await page.goto("/sign-in");
    // Ensure credentials are NOT pre-filled on the public sign-in page
    await expect(page.getByTestId("login-identifier-input")).toHaveValue("");
    await expect(page.getByTestId("login-pin-input")).toHaveValue("");
    await expect(page.getByTestId("submit-university-login-btn")).toBeDisabled();

    await page.getByTestId("login-identifier-input").fill("B23F0184CS042");
    await expect(page.getByTestId("parsed-reg-badge")).toBeVisible();
    await page.getByTestId("login-pin-input").fill("0184");
    await page.getByTestId("submit-university-login-btn").click();
    await page.waitForURL(/\/dashboard\/profile/);

    await expect(
      page.getByRole("heading", {
        name: /Student Skill & Time Capacity Profile/i,
      })
    ).toBeVisible();
    await expect(page.getByText(/Effective Effort Budget/i)).toBeVisible();

    // Verify custom Select combobox opens cleanly without native scrollbar glitches and updates GPA Band
    await page.getByRole("combobox", { name: "GPA Band" }).click();
    await page.getByRole("option", { name: /3\.8 – 4\.0 CGPA/i }).click();
    await expect(page.getByRole("combobox", { name: "GPA Band" })).toContainText("3.8 – 4.0 CGPA");

    await page.goto("/dashboard/recommendations");
    await expect(page.getByTestId("idea-card-CORE_SAFE")).toBeVisible();
    await expect(page.getByTestId("idea-card-CAREER_STRETCH")).toBeVisible();
    await expect(page.getByTestId("idea-card-RESEARCH_NICHE")).toBeVisible();
    await expect(page.getByTestId("duplicate-banner-CORE_SAFE")).toContainText(
      /High Similarity Detected/i
    );

    await page.getByTestId("shortlist-btn-CAREER_STRETCH").click();
    await expect(page.getByTestId("recommendation-action-toast")).toBeVisible();

    await page.getByTestId("generate-roadmap-btn-CORE_SAFE").click();
    await page.waitForURL(/\/dashboard\/roadmaps\//);
    await expect(page.getByTestId("milestone-card-1")).toBeVisible();
    await page.getByTestId("export-markdown-btn").click();
    await expect(page.getByTestId("exported-markdown-card")).toBeVisible();
  });

  test("Unauthenticated access to /dashboard/* redirects to /sign-in, forged cookies are rejected, and Coordinator RBAC boundaries hold", async ({
    page,
  }) => {
    // 1. Unauthenticated user attempting /dashboard/coordinator is redirected to /sign-in
    await page.goto("/dashboard/coordinator");
    await page.waitForURL(/\/sign-in/);

    // 2. Forged unsigned cookie injection is rejected by HMAC verifier and redirected to /sign-in
    await page.context().addCookies([
      {
        name: "projectcompass_uni_session",
        value: JSON.stringify({
          userId: "forged_admin",
          identifier: "B23F0184CS042",
          email: "hacker@university.edu",
          fullName: "Forged Admin",
          role: "ADMIN",
          departmentId: "cm0deptbscs00000000000001",
          departmentCode: "BSCS",
        }),
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/dashboard/admin");
    await page.waitForURL(/\/sign-in/);

    // 3. Legitimate Faculty Coordinator signs in and accesses /dashboard/coordinator
    await page.getByTestId("tab-faculty-login").click();
    await page.getByTestId("login-identifier-input").fill("salman.raza@university.edu");
    await page.getByTestId("login-pin-input").fill("2026");
    await page.getByTestId("submit-university-login-btn").click();

    await page.waitForURL(/\/dashboard\/coordinator/);
    await expect(
      page.getByRole("heading", {
        name: /Past Project Archives & Department Supervision Capacity/i,
      })
    ).toBeVisible();
    await expect(page.getByText(/NEEDS_MANUAL_ABSTRACT/i)).toBeVisible();

    // 4. Coordinator attempting to access /dashboard/admin (ADMIN only) is blocked and redirected
    await page.goto("/dashboard/admin");
    await page.waitForURL(/\/dashboard\/recommendations/);
  });
});
