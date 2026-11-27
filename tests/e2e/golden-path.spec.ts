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

    // Fill real student skills, domain interest, and career goal (profile starts clean without dummy data)
    const skillInput = page.getByPlaceholder(/Type skill name/i);
    for (const skillName of ["TypeScript", "Next.js", "PostgreSQL"]) {
      await skillInput.fill(skillName);
      await page.getByTestId("add-custom-skill-btn").click();
    }
    await page.getByRole("button", { name: "DevTools", exact: true }).click();
    await page
      .getByPlaceholder(/Backend & Distributed Systems Engineer/i)
      .fill("Full-Stack & AI Systems Engineer");
    await page.getByRole("button", { name: /Save Skill Profile/i }).click();
    await expect(page.getByText(/saved|calibrated/i).first()).toBeVisible({ timeout: 15000 });

    await page.goto("/dashboard/recommendations");
    await expect(page.getByTestId("idea-card-CORE_SAFE")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("idea-card-CAREER_STRETCH")).toBeVisible();
    await expect(page.getByTestId("idea-card-RESEARCH_NICHE")).toBeVisible();

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

    // 4. Coordinator attempting to access /dashboard/admin (ADMIN only) or /dashboard/roadmaps (STUDENT only) is blocked and redirected back to /dashboard/coordinator
    await page.goto("/dashboard/admin");
    await page.waitForURL(/\/dashboard\/coordinator/);
    await page.goto("/dashboard/roadmaps");
    await page.waitForURL(/\/dashboard\/coordinator/);
  });

  test("Multi-batch BSIT registration (Fall 2022 · BSIT) and Mobile (375px) & Tablet (768px) responsive layout without horizontal overflow", async ({
    page,
  }) => {
    // 1. Mobile viewport (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const landingOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(landingOverflow).toBe(false);

    // 2. Register a Fall 2022 BSIT student (proving multi-batch & whole IT department support)
    const uniqueRoll = String(Math.floor(100 + Math.random() * 899));
    const bsitRegNo = `B22F0512IT${uniqueRoll}`;

    await page.goto("/sign-up");
    await page.getByTestId("register-student-name").fill("Zainab Malik");
    await page.getByTestId("register-student-regno").fill(bsitRegNo);
    await expect(page.getByText(/Fall 2022/i)).toBeVisible();
    await expect(page.getByText(/Department of Information Technology/i)).toBeVisible();
    await page.getByTestId("register-student-pin").fill("0512");
    await page.getByTestId("register-submit-btn").click();

    await page.waitForURL(/\/dashboard\/profile/);
    await expect(
      page.getByRole("main").getByText(new RegExp(`Fall 2022 · BSIT · Roll #${uniqueRoll}`))
    ).toBeVisible();

    const profileMobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(profileMobileOverflow).toBe(false);

    // Open mobile navigation drawer and navigate to Recommendations
    await page.getByRole("button", { name: /Toggle workspace navigation/i }).click();
    await page.getByRole("link", { name: "FYP Recommendations", exact: true }).click();
    await page.waitForURL(/\/dashboard\/recommendations/);

    const recsMobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(recsMobileOverflow).toBe(false);

    // 3. Tablet viewport (768x1024) on Supervisor Matching with BSIT filter
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/dashboard/supervisors");
    await page.getByRole("combobox", { name: "Filter IT Program" }).click();
    await page.getByRole("option", { name: "BSIT Faculty" }).click();
    await expect(page.getByText(/Dr\. Usman Tariq/i)).toBeVisible();

    const supTabletOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(supTabletOverflow).toBe(false);
  });
});
