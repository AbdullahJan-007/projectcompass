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
import {
  DEPARTMENT_MAP,
  resolveDepartmentByCode,
} from "../src/lib/auth/university-id";
import {
  buildDefaultAccountsDb,
  hashFourDigitPin,
} from "../src/lib/auth/account-registry";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    },
  },
});

const PUBLIC_RLS_TABLES = [
  "Department",
  "Cohort",
  "User",
  "StudentAccount",
  "FacultyAccount",
  "Skill",
  "StudentProfile",
  "StudentSkill",
  "SupervisorProfile",
  "SupervisorSkill",
  "SeedIdeaTemplate",
  "ProjectArchive",
  "RecommendationRun",
  "RecommendedIdea",
  "IdeaSkillGap",
  "SupervisorMatch",
  "SupervisorRequest",
  "ProjectRoadmap",
  "RoadmapMilestone",
  "MarketTrendSnapshot",
  "AuditLog",
] as const;

async function ensureDatabaseExtensionsIndexesAndRls() {
  await prisma.$executeRawUnsafe(
    `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;`
  );

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

  // Enable Row Level Security (RLS) across all 21 public tables with zero permissive PostgREST policies
  await prisma.$transaction(
    PUBLIC_RLS_TABLES.map((tableName) =>
      prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`)
    )
  );
}

async function seedBootstrapAdminAccount() {
  const bootstrapEmail = (
    process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@projectcompass.edu"
  )
    .trim()
    .toLowerCase();
  const bootstrapPin = (process.env.BOOTSTRAP_ADMIN_PIN || "2026").trim();
  const pinHash = hashFourDigitPin(bootstrapPin);
  const bsitDeptId = resolveDepartmentByCode("BSIT").id;

  const existingAdminFaculty = await prisma.facultyAccount.findUnique({
    where: { facultyHandle: "admin" },
    include: { user: true },
  });

  if (existingAdminFaculty) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existingAdminFaculty.userId },
        data: {
          email: bootstrapEmail,
          fullName: "University System Administrator",
          role: "ADMIN",
          departmentId: bsitDeptId,
          isActive: true,
        },
      }),
      prisma.facultyAccount.update({
        where: { id: existingAdminFaculty.id },
        data: {
          universityEmail: bootstrapEmail,
          designation: "University Administrator",
          departmentCode: "BSIT",
          pinHash,
        },
      }),
    ]);
    return;
  }

  const adminUser = await prisma.user.upsert({
    where: { email: bootstrapEmail },
    update: {
      fullName: "University System Administrator",
      role: "ADMIN",
      departmentId: bsitDeptId,
      isActive: true,
    },
    create: {
      id: "cm0userbootstrapadmin0001",
      clerkId: "admin",
      email: bootstrapEmail,
      fullName: "University System Administrator",
      role: "ADMIN",
      departmentId: bsitDeptId,
      isActive: true,
    },
  });

  await prisma.facultyAccount.upsert({
    where: { universityEmail: bootstrapEmail },
    update: {
      facultyHandle: "admin",
      designation: "University Administrator",
      departmentCode: "BSIT",
      pinHash,
    },
    create: {
      id: "cm0facacc_bootstrap_admin",
      userId: adminUser.id,
      facultyHandle: "admin",
      universityEmail: bootstrapEmail,
      designation: "University Administrator",
      departmentCode: "BSIT",
      pinHash,
    },
  });
}

async function main() {
  // 0. Ensure pgvector extension, HNSW indexes, check constraints, and 21/21 RLS lockdown (idempotent)
  await ensureDatabaseExtensionsIndexesAndRls();

  // 1. All 6 IT & Computing Academic Departments (batched transaction)
  await prisma.$transaction(
    Object.values(DEPARTMENT_MAP).map((deptMeta) =>
      prisma.department.upsert({
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
      })
    )
  );

  // 2. All 62 Canonical Skills across 7 categories (batched transaction)
  const upsertedSkills = await prisma.$transaction(
    CANONICAL_SKILLS.map((skill) =>
      prisma.skill.upsert({
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
      })
    )
  );

  const skillIdBySlug = new Map<string, string>();
  for (const s of upsertedSkills) {
    skillIdBySlug.set(s.slug, s.id);
  }

  // 3. All 42 Curated SeedIdeaTemplate Archetypes + 1536-dim pgvector embeddings (batched transactions)
  const upsertedSeeds = await prisma.$transaction(
    SEED_IDEA_TEMPLATES.map((seed) =>
      prisma.seedIdeaTemplate.upsert({
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
      })
    )
  );

  await prisma.$transaction(
    SEED_IDEA_TEMPLATES.map((seed, idx) => {
      const targetId = upsertedSeeds[idx]!.id;
      const embeddingText = `${seed.title} | ${seed.domain} | ${seed.requiredSkillSlugs.join(", ")} | ${seed.problemSummary} | ${seed.coreDeliverable}`;
      const vecLiteral = toPgVectorLiteral(
        generateDeterministicEmbedding(embeddingText)
      );
      return prisma.$executeRaw`
        UPDATE "SeedIdeaTemplate"
        SET embedding = ${vecLiteral}::vector
        WHERE id = ${targetId}
      `;
    })
  );

  // 4. All 12 MarketTrendSnapshot Benchmarks (batched transaction)
  await prisma.$transaction(
    MARKET_TREND_SNAPSHOTS.map((trend) =>
      prisma.marketTrendSnapshot.upsert({
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
      })
    )
  );

  // 5. Bootstrap University Admin Account (Production & Local Governance Entry Point)
  await seedBootstrapAdminAccount();

  const includeDemoData =
    process.env.SEED_DEMO_DATA === "true" &&
    process.env.NODE_ENV !== "production";

  if (!includeDemoData) {
    return;
  }

  // ============================================================================
  // LOCAL / CI DEMO DATA ONLY (Never seeded into production or Supabase unless
  // SEED_DEMO_DATA="true" is explicitly set in a non-production environment)
  // ============================================================================
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

  // 6. Local Demo Student & Faculty Accounts
  const defaultAccounts = buildDefaultAccountsDb();
  const baselineSkills: Array<{
    slug: string;
    proficiency: "ADVANCED" | "INTERMEDIATE" | "BEGINNER";
  }> = [
    { slug: "typescript", proficiency: "ADVANCED" },
    { slug: "nextjs", proficiency: "INTERMEDIATE" },
    { slug: "postgresql", proficiency: "INTERMEDIATE" },
    { slug: "pgvector", proficiency: "BEGINNER" },
  ];

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

    const validStudentSkills = baselineSkills
      .map((bs) => {
        const skillId = skillIdBySlug.get(bs.slug);
        return skillId ? { skillId, proficiency: bs.proficiency } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (validStudentSkills.length > 0) {
      await prisma.$transaction(
        validStudentSkills.map((bs) =>
          prisma.studentSkill.upsert({
            where: {
              studentProfileId_skillId: {
                studentProfileId: stuProfile.id,
                skillId: bs.skillId,
              },
            },
            update: { proficiency: bs.proficiency },
            create: {
              studentProfileId: stuProfile.id,
              skillId: bs.skillId,
              proficiency: bs.proficiency,
            },
          })
        )
      );
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

  // 7. Local Demo Supervisors across all 6 IT programs (BSIT - BSDS) & Past-FYP Archives
  const demoFacultyPinHash = hashFourDigitPin("2026");

  for (const sup of DEMO_SUPERVISORS) {
    const existingAccount = defaultAccounts.facultyAccounts.find(
      (f) => f.universityEmail.toLowerCase() === sup.email.toLowerCase()
    );
    const desiredRole = existingAccount?.role ?? "SUPERVISOR";
    const supDept = resolveDepartmentByCode(sup.programCode);
    const supDepartmentId = supDept.id;
    const supHandle = (sup.email.split("@")[0] ?? sup.id).toLowerCase();

    const supUser = await prisma.user.upsert({
      where: { email: sup.email },
      update: {
        fullName: sup.fullName,
        role: desiredRole,
        departmentId: supDepartmentId,
      },
      create: {
        id: sup.userId,
        clerkId: supHandle,
        email: sup.email,
        fullName: sup.fullName,
        role: desiredRole,
        departmentId: supDepartmentId,
      },
    });

    if (!existingAccount) {
      await prisma.facultyAccount.upsert({
        where: { universityEmail: sup.email },
        update: {
          designation: sup.title,
          departmentCode: supDept.code,
          pinHash: demoFacultyPinHash,
        },
        create: {
          id: `cm0facacc_${supHandle.replace(/[^a-z0-9]/g, "_")}`,
          userId: supUser.id,
          facultyHandle: supHandle,
          universityEmail: sup.email,
          designation: sup.title,
          departmentCode: supDept.code,
          pinHash: demoFacultyPinHash,
        },
      });
    }

    const supProfile = await prisma.supervisorProfile.upsert({
      where: { userId: supUser.id },
      update: {
        departmentId: supDepartmentId,
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
        departmentId: supDepartmentId,
        title: sup.title,
        researchDomains: sup.researchDomains,
        bio: sup.bio,
        preferredStacks: sup.preferredStacks,
        maxSlots: sup.maxSlots,
        activeSlots: sup.activeSlots,
        isAccepting: sup.isAccepting,
      },
    });

    const validSupSkillIds = sup.skillSlugs
      .map((slug) => skillIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    if (validSupSkillIds.length > 0) {
      await prisma.$transaction(
        validSupSkillIds.map((skillId) =>
          prisma.supervisorSkill.upsert({
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
          })
        )
      );
    }

    const supEmbeddingText = `${sup.researchDomains.join(", ")} | ${sup.preferredStacks.join(", ")} | ${sup.skillSlugs.join(", ")} | ${sup.bio}`;
    const supVecLiteral = toPgVectorLiteral(
      generateDeterministicEmbedding(supEmbeddingText)
    );
    await prisma.$executeRaw`
      UPDATE "SupervisorProfile"
      SET "profileEmbedding" = ${supVecLiteral}::vector
      WHERE id = ${supProfile.id}
    `;
  }

  const upsertedArchives = await prisma.$transaction(
    DEMO_PROJECT_ARCHIVES.map((arch) => {
      const archDeptId = resolveDepartmentByCode(
        arch.programCode ?? "BSCS"
      ).id;
      return prisma.projectArchive.upsert({
        where: { id: arch.id },
        update: {
          departmentId: archDeptId,
          title: arch.title,
          abstract: arch.abstract,
          academicYear: arch.academicYear,
          domain: arch.domain,
          techStack: arch.techStack,
          ingestStatus: "READY",
        },
        create: {
          id: arch.id,
          departmentId: archDeptId,
          title: arch.title,
          abstract: arch.abstract,
          academicYear: arch.academicYear,
          domain: arch.domain,
          techStack: arch.techStack,
          ingestStatus: "READY",
        },
      });
    })
  );

  await prisma.$transaction(
    DEMO_PROJECT_ARCHIVES.map((arch, idx) => {
      const targetId = upsertedArchives[idx]!.id;
      const archEmbeddingText = `${arch.title} | ${arch.domain} | ${arch.techStack.join(", ")} | ${arch.abstract}`;
      const archVecLiteral = toPgVectorLiteral(
        generateDeterministicEmbedding(archEmbeddingText)
      );
      return prisma.$executeRaw`
        UPDATE "ProjectArchive"
        SET embedding = ${archVecLiteral}::vector
        WHERE id = ${targetId}
      `;
    })
  );

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
