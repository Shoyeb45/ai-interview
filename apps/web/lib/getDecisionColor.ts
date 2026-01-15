// src/lib/getDecisionColor.ts
import { HiringMetric } from "@/types/interview";

export const getDecisionColor = (decision: HiringMetric): string => {
  switch (decision) {
    case "HIRE":
      return "bg-green-100 text-green-800";
    case "MAYBE":
      return "bg-yellow-100 text-yellow-800";
    case "NO_HIRE":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
