"use client";

import { useEffect, useState } from "react";

export type OpportunityType = "Internship" | "Job" | "Apprenticeship" | "Live Project";
export type ApplicationStatus = "Applied" | "Under Review" | "Shortlisted" | "Interview Scheduled" | "Offered" | "Rejected";

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: "Remote" | "Hybrid" | "On-site";
  duration: string;
  type: OpportunityType;
  stipend: string;
  deadline: string;
  skills: string[];
  description: string;
  seats: number;
  status: "Open" | "Closing soon" | "Closed";
  publishedAt: string;
}

export interface Application {
  id: string;
  opportunityId: string;
  studentName: string;
  appliedAt: string;
  matchScore: number;
  status: ApplicationStatus;
  nextStep: string;
}

export interface Candidate {
  id: string;
  name: string;
  institution: string;
  program: string;
  skills: string[];
  verifiedSkills: string[];
  assessmentScore: number;
  projects: number;
  availability: string;
  portfolioReady: boolean;
}

export interface PlatformData {
  version: 1;
  opportunities: Opportunity[];
  applications: Application[];
  savedOpportunityIds: string[];
  shortlistedCandidateIds: string[];
}

const STORAGE_KEY = "origin-point:platform:v1";
const UPDATE_EVENT = "origin-point-platform:updated";

export const studentProfile = {
  name: "Student User",
  institution: "Origin Institute of Technology",
  program: "B.Tech Computer Science",
  skills: ["React", "TypeScript", "Node.js", "Python", "SQL", "Git", "REST APIs", "Figma"],
  verifiedSkills: ["React", "SQL", "Python"],
};

const seedOpportunities: Opportunity[] = [
  {
    id: "opp-frontend-2026",
    title: "Frontend Developer Intern",
    company: "TechCorp India",
    location: "Remote",
    workMode: "Remote",
    duration: "3 months",
    type: "Internship",
    stipend: "₹25,000 / month",
    deadline: "2026-10-04",
    skills: ["React", "TypeScript", "Git"],
    description: "Build accessible product interfaces with a mentored engineering team. Includes weekly feedback and a verified completion record.",
    seats: 8,
    status: "Open",
    publishedAt: "2026-09-12",
  },
  {
    id: "opp-data-2026",
    title: "Data Science Trainee",
    company: "AnalyticsPro",
    location: "Bengaluru",
    workMode: "Hybrid",
    duration: "6 months",
    type: "Apprenticeship",
    stipend: "₹20,000 / month",
    deadline: "2026-09-22",
    skills: ["Python", "SQL", "Data Analysis"],
    description: "Learn on live analytics problems, complete a guided learning sprint, and present insights to an industry panel.",
    seats: 15,
    status: "Closing soon",
    publishedAt: "2026-09-08",
  },
  {
    id: "opp-product-2026",
    title: "UX Research Fellow",
    company: "DesignHub",
    location: "Mumbai",
    workMode: "Hybrid",
    duration: "4 months",
    type: "Internship",
    stipend: "₹18,000 / month",
    deadline: "2026-10-10",
    skills: ["Figma", "User Research", "Communication"],
    description: "Plan research, synthesize interviews, and prototype a meaningful product improvement with a design mentor.",
    seats: 4,
    status: "Open",
    publishedAt: "2026-09-14",
  },
  {
    id: "opp-cloud-2026",
    title: "Cloud Deployment Live Project",
    company: "Northstar Labs",
    location: "Hyderabad",
    workMode: "Remote",
    duration: "8 weeks",
    type: "Live Project",
    stipend: "Certificate + mentor support",
    deadline: "2026-09-28",
    skills: ["Node.js", "AWS", "DevOps"],
    description: "Ship a production-style service with CI/CD, monitoring, and a public project showcase. Ideal for cloud-curious teams.",
    seats: 20,
    status: "Open",
    publishedAt: "2026-09-15",
  },
];

export const seedCandidates: Candidate[] = [
  {
    id: "candidate-aarav",
    name: "Aarav Mehta",
    institution: "IIT Delhi",
    program: "B.Tech Computer Science · Final year",
    skills: ["React", "TypeScript", "Next.js", "Git"],
    verifiedSkills: ["React", "TypeScript"],
    assessmentScore: 92,
    projects: 4,
    availability: "Available now",
    portfolioReady: true,
  },
  {
    id: "candidate-meera",
    name: "Meera Iyer",
    institution: "NIT Trichy",
    program: "B.Tech Data Science · Final year",
    skills: ["Python", "SQL", "Tableau", "Data Analysis"],
    verifiedSkills: ["Python", "SQL"],
    assessmentScore: 87,
    projects: 3,
    availability: "Available from October",
    portfolioReady: true,
  },
  {
    id: "candidate-kabir",
    name: "Kabir Shah",
    institution: "Srishti Institute of Art, Design and Technology",
    program: "B.Des Product Design · Final year",
    skills: ["Figma", "User Research", "Prototyping", "Communication"],
    verifiedSkills: ["Figma"],
    assessmentScore: 81,
    projects: 5,
    availability: "Available now",
    portfolioReady: true,
  },
  {
    id: "candidate-nisha",
    name: "Nisha Kulkarni",
    institution: "VJTI Mumbai",
    program: "B.Tech Computer Science · Third year",
    skills: ["React", "JavaScript", "SQL", "Git"],
    verifiedSkills: ["SQL"],
    assessmentScore: 78,
    projects: 2,
    availability: "Available from November",
    portfolioReady: false,
  },
];

function seedPlatform(): PlatformData {
  return {
    version: 1,
    opportunities: seedOpportunities,
    applications: [
      {
        id: "application-seed-1",
        opportunityId: "opp-data-2026",
        studentName: studentProfile.name,
        appliedAt: "2026-09-08",
        matchScore: 78,
        status: "Under Review",
        nextStep: "Recruiter screening in progress",
      },
    ],
    savedOpportunityIds: ["opp-product-2026"],
    shortlistedCandidateIds: [],
  };
}

function isPlatformData(value: unknown): value is PlatformData {
  return Boolean(value && typeof value === "object" && Array.isArray((value as PlatformData).opportunities));
}

export function getPlatformData(): PlatformData {
  if (typeof window === "undefined") return seedPlatform();

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (isPlatformData(parsed)) return parsed;
  } catch {
    // A corrupt browser cache should never prevent access to the portal.
  }

  const seed = seedPlatform();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function commit(next: PlatformData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

export function usePlatformData() {
  const [platform, setPlatform] = useState<PlatformData | null>(null);

  useEffect(() => {
    const refresh = () => setPlatform(getPlatformData());
    refresh();
    window.addEventListener(UPDATE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(UPDATE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return platform;
}

export function getMatchScore(requiredSkills: string[], candidateSkills = studentProfile.skills, verifiedSkills = studentProfile.verifiedSkills) {
  if (!requiredSkills.length) return 50;
  const normalisedCandidateSkills = candidateSkills.map(normaliseSkill);
  const normalisedVerifiedSkills = verifiedSkills.map(normaliseSkill);
  const matches = requiredSkills.filter((skill) => normalisedCandidateSkills.includes(normaliseSkill(skill)));
  const verifiedMatches = requiredSkills.filter((skill) => normalisedVerifiedSkills.includes(normaliseSkill(skill)));
  const rawScore = 38 + (matches.length / requiredSkills.length) * 48 + (verifiedMatches.length / requiredSkills.length) * 14;
  return Math.round(Math.min(98, rawScore));
}

export function getMatchedSkills(requiredSkills: string[], candidateSkills = studentProfile.skills) {
  const normalisedCandidateSkills = candidateSkills.map(normaliseSkill);
  return requiredSkills.filter((skill) => normalisedCandidateSkills.includes(normaliseSkill(skill)));
}

export function getMissingSkills(requiredSkills: string[], candidateSkills = studentProfile.skills) {
  const normalisedCandidateSkills = candidateSkills.map(normaliseSkill);
  return requiredSkills.filter((skill) => !normalisedCandidateSkills.includes(normaliseSkill(skill)));
}

function normaliseSkill(skill: string) {
  return skill.trim().toLowerCase().replace(/\./g, "");
}

export function createOpportunity(input: Omit<Opportunity, "id" | "publishedAt" | "status">) {
  const data = getPlatformData();
  const opportunity: Opportunity = {
    ...input,
    id: `opp-${Date.now().toString(36)}`,
    publishedAt: new Date().toISOString().slice(0, 10),
    status: "Open",
  };
  commit({ ...data, opportunities: [opportunity, ...data.opportunities] });
  return opportunity;
}

export function toggleSavedOpportunity(opportunityId: string) {
  const data = getPlatformData();
  const isSaved = data.savedOpportunityIds.includes(opportunityId);
  commit({
    ...data,
    savedOpportunityIds: isSaved
      ? data.savedOpportunityIds.filter((id) => id !== opportunityId)
      : [...data.savedOpportunityIds, opportunityId],
  });
}

export function applyToOpportunity(opportunityId: string) {
  const data = getPlatformData();
  const existing = data.applications.find((application) => application.opportunityId === opportunityId && application.studentName === studentProfile.name);
  if (existing) return { application: existing, created: false };

  const opportunity = data.opportunities.find((item) => item.id === opportunityId);
  if (!opportunity) throw new Error("This opportunity is no longer available.");

  const application: Application = {
    id: `application-${Date.now().toString(36)}`,
    opportunityId,
    studentName: studentProfile.name,
    appliedAt: new Date().toISOString().slice(0, 10),
    matchScore: getMatchScore(opportunity.skills),
    status: "Applied",
    nextStep: "Your application has been shared with the recruiter",
  };
  commit({ ...data, applications: [application, ...data.applications] });
  return { application, created: true };
}

export function updateApplicationStatus(applicationId: string, status: ApplicationStatus) {
  const data = getPlatformData();
  const nextSteps: Record<ApplicationStatus, string> = {
    Applied: "Your application has been shared with the recruiter",
    "Under Review": "Recruiter screening in progress",
    Shortlisted: "Your profile is shortlisted for the next round",
    "Interview Scheduled": "Confirm your interview availability",
    Offered: "Review and respond to your offer",
    Rejected: "The recruiter has closed this application",
  };
  commit({
    ...data,
    applications: data.applications.map((application) =>
      application.id === applicationId ? { ...application, status, nextStep: nextSteps[status] } : application
    ),
  });
}

export function toggleShortlistedCandidate(candidateId: string) {
  const data = getPlatformData();
  const exists = data.shortlistedCandidateIds.includes(candidateId);
  commit({
    ...data,
    shortlistedCandidateIds: exists
      ? data.shortlistedCandidateIds.filter((id) => id !== candidateId)
      : [...data.shortlistedCandidateIds, candidateId],
  });
}

export function resetDemoData() {
  commit(seedPlatform());
}
