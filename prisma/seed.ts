import { PrismaClient } from "@prisma/client";
import {
  CANONICAL_SKILLS,
  SEED_IDEA_TEMPLATES,
  MARKET_TREND_SNAPSHOTS,
  DEMO_SUPERVISORS,
  DEMO_PROJECT_ARCHIVES,
} from "../src/lib/recommendation/seed-data";
import {
  generateDeterministicEmbedding,
  toPgVectorLiteral,
} from "../src/lib/ai/embeddings";
import { DEPARTMENT_MAP } from "../src/lib/auth/university-id";
import { buildDefaultAccountsDb } from "../src/lib/auth/account-registry";

const prisma = new PrismaClient();

async function main() {
  // 0. Ensure pgvector extension, HNSW indexes, and DB-level check constraints (idempotent)
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_seed_idea_embedding_hnsw
      ON "SeedIdeaTemplate" USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_project_archive_embedding_hnsw
      ON "ProjectArchive" USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_supervisor_profile_embedding_hnsw
      ON "SupervisorProfile" USING hnsw ("profileEmbedding" vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      ALTER TABLE "SupervisorProfile"
        ADD CONSTRAINT chk_supervisor_slots_valid
        CHECK ("activeSlots" >= 0 AND "activeSlots" <= "maxSlots" AND "maxSlots" >= 0);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      ALTER TABLE "RecommendedIdea"
        ADD CONSTRAINT chk_feasibility_bounds
        CHECK ("feasibilityScore" >= 0 AND "feasibilityScore" <= 100);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // 1. All 6 Academic Departments & Active BSCS/BSSE Cohorts
  for (const deptMeta of Object.values(DEPARTMENT_MAP)) {
    await prisma.department.upsert({
      where: { code: deptMeta.code },
      update: {
        name: deptMeta.name,
        university: "National University of Computing & Emerging Sciences",
        defaultSlots: 5,
      },
      create: {
        id: deptMeta.id,
        code: deptMeta.code,
        name: deptMeta.name,
        university: "National University of Computing & Emerging Sciences",
        defaultSlots: 5,
      },
    });
  }

  const departmentId = DEPARTMENT_MAP["CS"]!.id;

  const activeCohort = await prisma.cohort.upsert({
    where: {
      departmentId_name: {
        departmentId,
        name: "FYP 2026-2027",
      },
    },
    update: {
      isActive: true,
    },
    create: {
      id: "cm0cohort2627000000000001",
      departmentId,
      name: "FYP 2026-2027",
      startDate: new Date("2026-09-01T00:00:00Z"),
      endDate: new Date("2027-05-15T00:00:00Z"),
      isActive: true,
    },
  });

  // 2. 62 Canonical Skills across 7 categories
  const skillIdBySlug = new Map<string, string>();
  for (const skill of CANONICAL_SKILLS) {
    const upsertedSkill = await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: {
        displayName: skill.displayName,
        category: skill.category,
      },
      create: {
        slug: skill.slug,
        displayName: skill.displayName,
        category: skill.category,
      },
    });
    skillIdBySlug.set(skill.slug, upsertedSkill.id);
  }

  // 3. Baseline Student & Faculty University Portal Accounts (Parity with Dual-Auth Sign-In)
  const defaultAccounts = buildDefaultAccountsDb();
  for (const stu of defaultAccounts.studentAccounts) {
    const stuUser = await prisma.user.upsert({
      where: { email: stu.email },
      update: {
        fullName: stu.fullName,
        role: "STUDENT",
        departmentId: stu.departmentId,
      },
      create: {
        id: stu.userId,
        clerkId: stu.registrationNo,
        email: stu.email,
        fullName: stu.fullName,
        role: "STUDENT",
        departmentId: stu.departmentId,
      },
    });

    await prisma.studentAccount.upsert({
      where: { registrationNo: stu.registrationNo },
      update: {
        pinHash: stu.pinHash,
      },
      create: {
        id: stu.id,
        userId: stuUser.id,
        registrationNo: stu.registrationNo,
        program: stu.program,
        batchYear: stu.batchYear,
        intakeTerm: stu.intakeTerm,
        serialCode: stu.serialCode,
        departmentCode: stu.departmentCode,
        rollNumber: stu.rollNumber,
        pinHash: stu.pinHash,
      },
    });

    const stuProfile = await prisma.studentProfile.upsert({
      where: { userId: stuUser.id },
      update: {
        cohortId: activeCohort.id,
        status: "READY",
        interests: ["DevTools", "Applied AI"],
        careerGoal: "Full-Stack & AI Systems Engineer",
        preferredType: "PRODUCT_SAAS",
        weeklyHours: 15,
        durationWeeks: 24,
        teamSize: 2,
        gpaBand: "3.4 - 3.8",
      },
      create: {
        userId: stuUser.id,
        cohortId: activeCohort.id,
        status: "READY",
        interests: ["DevTools", "Applied AI"],
        careerGoal: "Full-Stack & AI Systems Engineer",
        preferredType: "PRODUCT_SAAS",
        weeklyHours: 15,
        durationWeeks: 24,
        teamSize: 2,
        gpaBand: "3.4 - 3.8",
      },
    });

    const baselineSkills: Array<{
      slug: string;
      proficiency: "ADVANCED" | "INTERMEDIATE" | "BEGINNER";
    }> = [
      { slug: "typescript", proficiency: "ADVANCED" },
      { slug: "nextjs", proficiency: "INTERMEDIATE" },
      { slug: "postgresql", proficiency: "INTERMEDIATE" },
      { slug: "pgvector", proficiency: "BEGINNER" },
    ];

    for (const bs of baselineSkills) {
      const skillId = skillIdBySlug.get(bs.slug);
      if (skillId) {
        await prisma.studentSkill.upsert({
          where: {
            studentProfileId_skillId: {
              studentProfileId: stuProfile.id,
              skillId,
            },
          },
          update: { proficiency: bs.proficiency },
          create: {
            studentProfileId: stuProfile.id,
            skillId,
            proficiency: bs.proficiency,
          },
        });
      }
    }
  }

  for (const fac of defaultAccounts.facultyAccounts) {
    const facUser = await prisma.user.upsert({
      where: { email: fac.universityEmail },
      update: {
        fullName: fac.fullName,
        role: fac.role,
        departmentId: fac.departmentId,
      },
      create: {
        id: fac.userId,
        clerkId: fac.facultyHandle,
        email: fac.universityEmail,
        fullName: fac.fullName,
        role: fac.role,
        departmentId: fac.departmentId,
      },
    });

    await prisma.facultyAccount.upsert({
      where: { universityEmail: fac.universityEmail },
      update: {
        pinHash: fac.pinHash,
        designation: fac.designation,
        departmentCode: fac.departmentCode,
      },
      create: {
        id: fac.id,
        userId: facUser.id,
        facultyHandle: fac.facultyHandle,
        universityEmail: fac.universityEmail,
        designation: fac.designation,
        departmentCode: fac.departmentCode,
        pinHash: fac.pinHash,
      },
    });
  }

  // 4. 42 Curated SeedIdeaTemplate Archetypes with 1536-dim embeddings
  for (const seed of SEED_IDEA_TEMPLATES) {
    const upsertedSeed = await prisma.seedIdeaTemplate.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        domain: seed.domain,
        problemSummary: seed.problemSummary,
        coreDeliverable: seed.coreDeliverable,
        requiredSkillSlugs: seed.requiredSkillSlugs,
        recommendedStack: seed.recommendedStack,
        difficulty: seed.difficulty,
        baseEffortHours: seed.baseEffortHours,
        publicDatasetAvailable: seed.publicDatasetAvailable,
        standardHardwareSufficient: seed.standardHardwareSufficient,
        noPaidApiLockin: seed.noPaidApiLockin,
        careerTracks: seed.careerTracks,
        isActive: true,
      },
      create: {
        id: seed.id,
        slug: seed.slug,
        title: seed.title,
        domain: seed.domain,
        problemSummary: seed.problemSummary,
        coreDeliverable: seed.coreDeliverable,
        requiredSkillSlugs: seed.requiredSkillSlugs,
        recommendedStack: seed.recommendedStack,
        difficulty: seed.difficulty,
        baseEffortHours: seed.baseEffortHours,
        publicDatasetAvailable: seed.publicDatasetAvailable,
        standardHardwareSufficient: seed.standardHardwareSufficient,
        noPaidApiLockin: seed.noPaidApiLockin,
        careerTracks: seed.careerTracks,
        isActive: true,
      },
    });

    const embeddingText = `${seed.title} | ${seed.domain} | ${seed.requiredSkillSlugs.join(", ")} | ${seed.problemSummary} | ${seed.coreDeliverable}`;
    const vecLiteral = toPgVectorLiteral(generateDeterministicEmbedding(embeddingText));
    await prisma.$executeRaw`
      UPDATE "SeedIdeaTemplate"
      SET embedding = ${vecLiteral}::vector
      WHERE id = ${upsertedSeed.id}
    `;
  }

  // 5. 12 MarketTrendSnapshot records (2026-Q4)
  for (const trend of MARKET_TREND_SNAPSHOTS) {
    await prisma.marketTrendSnapshot.upsert({
      where: { domainSlug: trend.domainSlug },
      update: {
        domainName: trend.domainName,
        demandLevel: trend.demandLevel,
        trendDirection: trend.trendDirection,
        topTechPairings: trend.topTechPairings,
        portfolioSignal: trend.portfolioSignal,
        sourceSummary: trend.sourceSummary,
        versionLabel: trend.versionLabel,
      },
      create: {
        id: trend.id,
        domainSlug: trend.domainSlug,
        domainName: trend.domainName,
        demandLevel: trend.demandLevel,
        trendDirection: trend.trendDirection,
        topTechPairings: trend.topTechPairings,
        portfolioSignal: trend.portfolioSignal,
        sourceSummary: trend.sourceSummary,
        versionLabel: trend.versionLabel,
      },
    });
  }

  // 6. 5 Demo Supervisors & 11 Demo Past-FYP Archives
  for (const sup of DEMO_SUPERVISORS) {
    const existingAccount = defaultAccounts.facultyAccounts.find(
      (f) => f.universityEmail.toLowerCase() === sup.email.toLowerCase()
    );
    const desiredRole = existingAccount?.role ?? "SUPERVISOR";

    const supUser = await prisma.user.upsert({
      where: { email: sup.email },
      update: {
        fullName: sup.fullName,
        role: desiredRole,
        departmentId,
      },
      create: {
        id: sup.userId,
        email: sup.email,
        fullName: sup.fullName,
        role: desiredRole,
        departmentId,
      },
    });

    const supProfile = await prisma.supervisorProfile.upsert({
      where: { userId: supUser.id },
      update: {
        departmentId,
        title: sup.title,
        researchDomains: sup.researchDomains,
        bio: sup.bio,
        preferredStacks: sup.preferredStacks,
        maxSlots: sup.maxSlots,
        activeSlots: sup.activeSlots,
        isAccepting: sup.isAccepting,
      },
      create: {
        id: sup.id,
        userId: supUser.id,
        departmentId,
        title: sup.title,
        researchDomains: sup.researchDomains,
        bio: sup.bio,
        preferredStacks: sup.preferredStacks,
        maxSlots: sup.maxSlots,
        activeSlots: sup.activeSlots,
        isAccepting: sup.isAccepting,
      },
    });

    for (const slug of sup.skillSlugs) {
      const skillId = skillIdBySlug.get(slug);
      if (skillId) {
        await prisma.supervisorSkill.upsert({
          where: {
            supervisorProfileId_skillId: {
              supervisorProfileId: supProfile.id,
              skillId,
            },
          },
          update: {},
          create: {
            supervisorProfileId: supProfile.id,
            skillId,
          },
        });
      }
    }

    const supEmbeddingText = `${sup.researchDomains.join(", ")} | ${sup.preferredStacks.join(", ")} | ${sup.skillSlugs.join(", ")} | ${sup.bio}`;
    const supVecLiteral = toPgVectorLiteral(generateDeterministicEmbedding(supEmbeddingText));
    await prisma.$executeRaw`
      UPDATE "SupervisorProfile"
      SET "profileEmbedding" = ${supVecLiteral}::vector
      WHERE id = ${supProfile.id}
    `;
  }

  for (const arch of DEMO_PROJECT_ARCHIVES) {
    const upsertedArch = await prisma.projectArchive.upsert({
      where: { id: arch.id },
      update: {
        departmentId,
        title: arch.title,
        abstract: arch.abstract,
        academicYear: arch.academicYear,
        domain: arch.domain,
        techStack: arch.techStack,
        ingestStatus: "READY",
      },
      create: {
        id: arch.id,
        departmentId,
        title: arch.title,
        abstract: arch.abstract,
        academicYear: arch.academicYear,
        domain: arch.domain,
        techStack: arch.techStack,
        ingestStatus: "READY",
      },
    });

    const archEmbeddingText = `${arch.title} | ${arch.domain} | ${arch.techStack.join(", ")} | ${arch.abstract}`;
    const archVecLiteral = toPgVectorLiteral(generateDeterministicEmbedding(archEmbeddingText));
    await prisma.$executeRaw`
      UPDATE "ProjectArchive"
      SET embedding = ${archVecLiteral}::vector
      WHERE id = ${upsertedArch.id}
    `;
  }

  await prisma.projectArchive.upsert({
    where: { id: "cm0arch11scannedpdf000011" },
    update: {
      departmentId,
      title: "Legacy Scanned Thesis: Campus Wi-Fi Rogue AP Monitor",
      abstract: "Scanned PDF upload without OCR text layer.",
      academicYear: 2022,
      domain: "Cybersecurity",
      techStack: ["Python", "Wireshark", "Linux"],
      ingestStatus: "NEEDS_MANUAL_ABSTRACT",
      ingestError:
        "Extracted abstract has fewer than 100 characters (scanned image-only PDF). Paste abstract manually to embed.",
    },
    create: {
      id: "cm0arch11scannedpdf000011",
      departmentId,
      title: "Legacy Scanned Thesis: Campus Wi-Fi Rogue AP Monitor",
      abstract: "Scanned PDF upload without OCR text layer.",
      academicYear: 2022,
      domain: "Cybersecurity",
      techStack: ["Python", "Wireshark", "Linux"],
      ingestStatus: "NEEDS_MANUAL_ABSTRACT",
      ingestError:
        "Extracted abstract has fewer than 100 characters (scanned image-only PDF). Paste abstract manually to embed.",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    process.stderr.write(`Seed failed: ${String(err)}\n`);
    await prisma.$disconnect();
    process.exit(1);
  });
