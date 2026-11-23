import { z } from "zod";

export const SynthesizedIdeaSchema = z.object({
  track: z.enum(["CORE_SAFE", "CAREER_STRETCH", "RESEARCH_NICHE"]),
  seedTemplateId: z.string(),
  title: z.string().min(12).max(110),
  problemStatement: z.string().min(60).max(450),
  proposedSolution: z.string().min(80).max(600),
  differentiationAngle: z.string().min(40).max(350).nullable(),
  recommendedStack: z
    .array(
      z.object({
        layer: z.string().min(2).max(40),
        tech: z.string().min(2).max(60),
        rationale: z.string().min(15).max(180),
      })
    )
    .min(4)
    .max(7),
  feasibilityExplanation: z.string().min(50).max(320),
  skillGapActions: z.array(
    z.object({
      skillSlug: z.string(),
      learningAction: z.string().min(20).max(200),
    })
  ),
});

export const RecommendationSynthesisResponseSchema = z.object({
  ideas: z.array(SynthesizedIdeaSchema).length(3),
});

export type SynthesizedIdeaOutput = z.infer<typeof SynthesizedIdeaSchema>;
