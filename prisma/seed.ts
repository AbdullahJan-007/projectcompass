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

const prisma = new PrismaClient();

async function main() {
  // 1. Default Department & Active Cohort
  const department = await prisma.department.upsert({
    where: { code: "BSCS" },
    update: {
      name: "Department of Computer Science",
      university: "National University of Computing & Emerging Sciences",
      defaultSlots: 5,
    },
    create: {
      id: "cm0deptbscs00000000000001",
      code: "BSCS",
      name: "Department of Computer Science",
      university: "National University of Computing & Emerging Sciences",
      defaultSlots: 5,
    },
  });

  await prisma.cohort.upsert({
    where: {
      departmentId_name: {
        departmentId: department.id,
        name: "FYP 2026-2027",
      },
    },
    update: {
      isActive: true,
    },
    create: {
      id: "cm0cohort2627000000000001",
      departmentId: department.id,
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

  // 3. 42 Curated SeedIdeaTemplate Archetypes with 1536-dim embeddings
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

  // 4. 12 MarketTrendSnapshot records (2026-Q4)
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

  // 5. 5 Demo Supervisors & 10 Demo Past-FYP Archives
  for (const sup of DEMO_SUPERVISORS) {
    const supUser = await prisma.user.upsert({
      where: { email: sup.email },
      update: {
        fullName: sup.fullName,
        role: "SUPERVISOR",
        departmentId: department.id,
      },
      create: {
        id: sup.userId,
        email: sup.email,
        fullName: sup.fullName,
        role: "SUPERVISOR",
        departmentId: department.id,
      },
    });

    const supProfile = await prisma.supervisorProfile.upsert({
      where: { userId: supUser.id },
      update: {
        departmentId: department.id,
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
        departmentId: department.id,
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
        departmentId: department.id,
        title: arch.title,
        abstract: arch.abstract,
        academicYear: arch.academicYear,
        domain: arch.domain,
        techStack: arch.techStack,
        ingestStatus: "READY",
      },
      create: {
        id: arch.id,
        departmentId: department.id,
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
