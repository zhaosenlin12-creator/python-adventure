"use client";

import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  Binary,
  Blocks,
  BookOpen,
  Bot,
  Box,
  Braces,
  BrainCircuit,
  Calculator,
  Coffee,
  CodeXml,
  Cpu,
  Database,
  FileCode,
  FolderKanban,
  Gamepad2,
  GitBranch,
  GraduationCap,
  Image,
  ListChecks,
  LockKeyhole,
  MonitorCog,
  Network,
  Orbit,
  PanelsTopLeft,
  Paintbrush,
  Sailboat,
  SearchCode,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TableProperties,
  Terminal,
  Variable,
  Waypoints,
  Workflow,
  Compass,
} from "lucide-react";

import type { LearningIconKey } from "@/lib/learningHub";

const ICON_MAP: Record<LearningIconKey, LucideIcon> = {
  backend: Server,
  frontend: MonitorCog,
  database: TableProperties,
  security: ShieldAlert,
  python: Braces,
  cpp: Cpu,
  java: Coffee,
  go: Sailboat,
  "web-foundations": CodeXml,
  vue: PanelsTopLeft,
  react: Orbit,
  "cyber-security": ShieldAlert,
  "ai-programming": Bot,
  "ai-education": GraduationCap,
  basics: BookOpen,
  logic: GitBranch,
  functions: Waypoints,
  data: Database,
  loops: Workflow,
  library: BookOpen,
  oop: Blocks,
  challenge: Compass,
  files: FolderKanban,
  shield: ShieldCheck,
  strings: Variable,
  lists: ListChecks,
  algorithm: BrainCircuit,
  project: FolderKanban,
  network: Network,
  analytics: Calculator,
  image: Image,
  audio: AudioLines,
  crypto: LockKeyhole,
  ai: Bot,
  space3d: Box,
  game: Gamepad2,
  prompt: Sparkles,
  verify: ShieldCheck,
  learning: GraduationCap,
  html: FileCode,
  css: Paintbrush,
  javascript: Binary,
  mysql: Database,
  query: SearchCode,
  safety: ShieldAlert,
  kali: Terminal,
};

interface LearningIconProps {
  icon: LearningIconKey;
  className?: string;
  strokeWidth?: number;
}

export function LearningIcon({
  icon,
  className = "h-6 w-6",
  strokeWidth = 2.2,
}: LearningIconProps) {
  const Icon = ICON_MAP[icon] ?? BookOpen;

  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
