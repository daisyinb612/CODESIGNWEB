"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  MicOff,
  Minimize2,
  Pause,
  PencilLine,
  Plus,
  RotateCcw,
  SkipForward,
  type LucideIcon,
} from "lucide-react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native-web";

type Stage =
  | "setup"
  | "practice"
  | "oral"
  | "ai-familiarity"
  | "scenario"
  | "role"
  | "control"
  | "parent-role"
  | "parent-control"
  | "parent-expectations"
  | "negotiate"
  | "negotiate-control"
  | "open-questions"
  | "complete";
type ScenarioStep = "intervention" | "action" | "length" | "reason";
type Intervention = "quiet" | "ask" | "direct";
type ScenarioResponse = {
  intervention?: Intervention;
  action?: string;
  length?: string;
  reason?: string;
};
type NegotiationChoice = "agree" | "keep" | "merge";
type AiFamiliarity = "used" | "heard" | "unfamiliar";
type DoubaoCallExperience = "yes" | "no" | "unsure";
type ParentRecordingPreference = "full" | "key-moments" | "no" | "joint";
type Gender = "female" | "male";
type ParentEducation = "middle-or-below" | "high-school" | "college" | "bachelor" | "master-or-above" | "prefer-not";
type FlowDestination = { key: string; label: string; stage: Stage; scenarioIndex?: number; scenarioStep?: ScenarioStep };
type LogEntry = { at: string; actor: "child" | "parent" | "family" | "researcher"; action: string; value?: string };
type ControlOption = { id: string; label: string; icon: LucideIcon };
type StudyState = {
  version: 4;
  stage: Stage;
  scenarioIndex: number;
  scenarioStep: ScenarioStep;
  startedAt: string;
  participant: {
    id: string;
    age: string;
    childGender?: Gender;
    parentAge: string;
    parentGender?: Gender;
    parentEducation?: ParentEducation;
    assisted: boolean;
  };
  responses: Record<string, ScenarioResponse>;
  childRoles: string[];
  controls: string[];
  controlCustom: string;
  voiceInterrupts: string[];
  voiceInterruptCustom: string;
  oralNote: string;
  aiFamiliarity?: AiFamiliarity;
  doubaoCall?: DoubaoCallExperience;
  aiFamiliarityNote: string;
  parentRoles: string[];
  parentControls: string[];
  parentControlCustom: string;
  parentVoiceInterrupts: string[];
  parentVoiceInterruptCustom: string;
  parentReason: string;
  parentRecordingPreference?: ParentRecordingPreference;
  parentHelpExpectation: string;
  negotiation?: NegotiationChoice;
  controlNegotiation?: NegotiationChoice;
  finalRoles: string[];
  finalControls: string[];
  finalControlCustom: string;
  finalVoiceInterrupts: string[];
  finalVoiceInterruptCustom: string;
  openAnswers: Record<string, string>;
  unresolved: boolean;
  logs: LogEntry[];
};

const STORAGE_KEY = "brickbuddy-formative-study-en-v1";

const flowDestinations: FlowDestination[] = [
  { key: "setup", label: "01 · Study setup", stage: "setup" },
  { key: "practice", label: "02 · Tap practice", stage: "practice" },
  { key: "oral", label: "03 · Recent building experience", stage: "oral" },
  { key: "ai-familiarity", label: "04 · Experience with AI", stage: "ai-familiarity" },
  { key: "scenario-0", label: "05 · Scenario: Finding a piece", stage: "scenario", scenarioIndex: 0, scenarioStep: "intervention" },
  { key: "scenario-1", label: "06 · Scenario: Focused on building", stage: "scenario", scenarioIndex: 1, scenarioStep: "intervention" },
  { key: "scenario-2", label: "07 · Scenario: Just finished a step", stage: "scenario", scenarioIndex: 2, scenarioStep: "intervention" },
  { key: "scenario-3", label: "08 · Scenario: Stuck or made a mistake", stage: "scenario", scenarioIndex: 3, scenarioStep: "intervention" },
  { key: "role", label: "09 · Child chooses AI roles", stage: "role" },
  { key: "control", label: "10 · Child chooses controls", stage: "control" },
  { key: "parent-role", label: "11 · Parent chooses AI roles", stage: "parent-role" },
  { key: "parent-control", label: "12 · Parent chooses controls", stage: "parent-control" },
  { key: "parent-expectations", label: "13 · Parent expectations", stage: "parent-expectations" },
  { key: "negotiate", label: "14 · Agree on AI roles", stage: "negotiate" },
  { key: "negotiate-control", label: "15 · Agree on controls", stage: "negotiate-control" },
  { key: "open-questions", label: "16 · Semi-structured interview", stage: "open-questions" },
  { key: "complete", label: "17 · Finish and export", stage: "complete" },
];

const childGenderOptions: { id: Gender; label: string }[] = [
  { id: "female", label: "Girl" },
  { id: "male", label: "Boy" },
];

const parentGenderOptions: { id: Gender; label: string }[] = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
];

const parentEducationOptions: { id: ParentEducation; label: string }[] = [
  { id: "middle-or-below", label: "Middle school or below" },
  { id: "high-school", label: "High school / vocational school" },
  { id: "college", label: "Associate degree" },
  { id: "bachelor", label: "Bachelor’s degree" },
  { id: "master-or-above", label: "Master’s degree or above" },
  { id: "prefer-not", label: "Prefer not to answer" },
];

const scenarios = [
  { id: "find", number: "01", title: "Finding a piece", context: "I can’t find a piece", description: "I’m looking through a pile of bricks and can’t find the piece I need", color: "#FFD54F", accent: "#E6A800", icon: "⌕" },
  { id: "build", number: "02", title: "Focused on building", context: "I’m focused on building", description: "I’m concentrating on putting the bricks together", color: "#77D6C8", accent: "#178B7B", icon: "✦" },
  { id: "done", number: "03", title: "Just finished a step", context: "I’ve just finished a step", description: "I’ve just completed one step in the instructions", color: "#7BB7FF", accent: "#2F6FC2", icon: "✓" },
  { id: "stuck", number: "04", title: "Stuck or made a mistake", context: "I’m stuck or may have made a mistake", description: "The bricks won’t fit, or I may have put something together incorrectly", color: "#FF8E7A", accent: "#C84B39", icon: "!" },
] as const;

const interventionOptions: { id: Intervention; label: string; hint: string; symbol: string }[] = [
  { id: "quiet", label: "Stay quiet", hint: "Let me try by myself", symbol: "◡" },
  { id: "ask", label: "Ask me first", hint: "Help only if I say yes", symbol: "?" },
  { id: "direct", label: "Help right away", hint: "Tell me now", symbol: "→" },
];

const actionOptions = [
  { id: "next", label: "Remind me of the next step", symbol: "→" },
  { id: "check", label: "Check my work", symbol: "✓" },
  { id: "knowledge", label: "Tell me something interesting", symbol: "✦" },
  { id: "question", label: "Ask me a question", symbol: "?" },
  { id: "answer", label: "Answer my question", symbol: "↗" },
];

const lengthOptions = [
  { id: "one", label: "Just one sentence", hint: "Quick and brief" },
  { id: "short", label: "Say a little", hint: "Two or three sentences" },
  { id: "long", label: "Explain in detail", hint: "I want to hear more" },
];

const controls: ControlOption[] = [
  { id: "pause", label: "Pause", icon: Pause },
  { id: "skip", label: "Skip", icon: SkipForward },
  { id: "repeat", label: "Say it again", icon: RotateCcw },
  { id: "next", label: "Next step", icon: ArrowRight },
  { id: "correct", label: "Correct the step", icon: PencilLine },
  { id: "custom", label: "My own idea", icon: Plus },
];

const voiceInterrupts: ControlOption[] = [
  { id: "stop", label: "Stop for a moment", icon: MicOff },
  { id: "shorter", label: "Say less", icon: Minimize2 },
  { id: "repeat", label: "Say it again", icon: RotateCcw },
  { id: "next", label: "Next step", icon: ArrowRight },
  { id: "correct", label: "Let me correct you", icon: PencilLine },
  { id: "custom", label: "My own idea", icon: Plus },
];

const aiFamiliarityOptions: { id: AiFamiliarity; label: string; hint: string; symbol: string }[] = [
  { id: "used", label: "I’ve used AI", hint: "I have an idea of what it can do", symbol: "✓" },
  { id: "heard", label: "I’ve heard of AI", hint: "But I’m not sure what it is", symbol: "?" },
  { id: "unfamiliar", label: "I haven’t heard of it", hint: "Or I don’t know what AI is", symbol: "○" },
];

const doubaoCallOptions: { id: DoubaoCallExperience; label: string; hint: string; symbol: string }[] = [
  { id: "yes", label: "Yes, I’ve called it", hint: "I’ve used Doubao’s voice-call feature", symbol: "☎" },
  { id: "no", label: "No, I haven’t", hint: "I haven’t used this feature", symbol: "×" },
  { id: "unsure", label: "I’m not sure", hint: "I may have used something similar", symbol: "?" },
];

const parentRecordingOptions: { id: ParentRecordingPreference; label: string; hint: string; symbol: string }[] = [
  { id: "full", label: "Record everything", hint: "So we can revisit the whole building process", symbol: "●" },
  { id: "key-moments", label: "Record key moments only", hint: "For example, completed steps, difficulties, or the final creation", symbol: "◆" },
  { id: "no", label: "Don’t record", hint: "Offer help without saving the process", symbol: "×" },
  { id: "joint", label: "Decide with my child", hint: "Ask for the child’s permission each time", symbol: "⇄" },
];

const openQuestions = [
  {
    id: "timingContrast",
    dimension: "RQ · Timing of intervention",
    audience: "Child answers first; parent adds observations",
    actor: "child",
    question: "Choose two of the four situations: When should the AI speak most? When should it stay quiet? Why?",
    probes: ["What would change if the AI spoke a little earlier or later?", "What are your hands and eyes usually doing at that moment?"],
    placeholder: "Record when the AI should speak or stay quiet and why. Note the parent’s different observations separately…",
  },
  {
    id: "contentBoundary",
    dimension: "RQ · Content and length",
    audience: "Child answers first",
    actor: "child",
    question: "At the moment when you want the AI to speak, what should its very first sentence be?",
    probes: ["Should it explain right away, ask you first, or wait for you to ask more? Why?", "At what point would it feel like enough, or start to interrupt you?"],
    placeholder: "Record the child’s example wording and their boundaries for content and length…",
  },
  {
    id: "controlRecovery",
    dimension: "RQ · Controls",
    audience: "Child answers first; parent adds observations",
    actor: "child",
    question: "If the AI reads the wrong step, talks too much, or you have already started the next step, what would you most like to do?",
    probes: ["Would you speak, press a button, or use another method?", "After it stops, should the rest be cancelled, shortened to one sentence, or said later?"],
    placeholder: "Record the trigger and the full interruption, correction, and recovery flow…",
  },
  {
    id: "priorityRule",
    dimension: "Summary · Design priority",
    audience: "Parent and child answer together",
    actor: "family",
    question: "If you could leave BrickBuddy’s designers with only one rule, what would you want it to be?",
    probes: ["Is the rule about when to speak, what to say, or who has control?", "If you cannot agree, you can each keep one rule."],
    placeholder: "Record the shared top rule. If there is no agreement, record each person’s rule separately…",
  },
] as const;

const roles = [
  { id: "friend", title: "Building buddy", subtitle: "Like a friend building beside me: responds to my ideas, chats, and encourages me without always telling me what to do.", symbol: "☻", color: "#FFD54F" },
  { id: "teacher", title: "Little teacher", subtitle: "Explains structures, ideas, or stories at the right time and asks questions that help me think for myself.", symbol: "✦", color: "#7BB7FF" },
  { id: "helper", title: "Helpful assistant", subtitle: "Helps me find pieces, check mistakes, or remember the next step when I need it, without interrupting too much.", symbol: "✓", color: "#77D6C8" },
  { id: "observer", title: "Quiet observer", subtitle: "Watches quietly most of the time and only points out important things when I’m stuck, make a mistake, or ask for help.", symbol: "◉", color: "#FF9D8C" },
];

function normalizeGender(value: unknown): Gender | undefined {
  return value === "female" || value === "male" ? value : undefined;
}

function initialState(): StudyState {
  return {
    version: 4,
    stage: "setup",
    scenarioIndex: 0,
    scenarioStep: "intervention",
    startedAt: new Date().toISOString(),
    participant: { id: "", age: "", parentAge: "", assisted: false },
    responses: {},
    childRoles: [],
    controls: [],
    controlCustom: "",
    voiceInterrupts: [],
    voiceInterruptCustom: "",
    oralNote: "",
    aiFamiliarityNote: "",
    parentRoles: [],
    parentControls: [],
    parentControlCustom: "",
    parentVoiceInterrupts: [],
    parentVoiceInterruptCustom: "",
    parentReason: "",
    parentHelpExpectation: "",
    finalRoles: [],
    finalControls: [],
    finalControlCustom: "",
    finalVoiceInterrupts: [],
    finalVoiceInterruptCustom: "",
    openAnswers: {},
    unresolved: false,
    logs: [],
  };
}

function buildRule(scenarioId: string, response: ScenarioResponse, override?: Intervention) {
  const scenario = scenarios.find((item) => item.id === scenarioId)!;
  const intervention = override ?? response.intervention;
  if (!intervention) return `${scenario.title}: unanswered.`;
  if (intervention === "quiet") return `When ${scenario.context.toLowerCase()}, the AI stays quiet.`;
  const verb = intervention === "ask" ? "asks me first before it " : "immediately ";
  const action = actionOptions.find((item) => item.id === response.action)?.label.toLowerCase() ?? "helps me";
  const length = lengthOptions.find((item) => item.id === response.length)?.label.toLowerCase() ?? "says a little";
  return `When ${scenario.context.toLowerCase()}, the AI ${verb}${action} and ${length}.`;
}

function summarizeControlChoices(options: ControlOption[], selected: string[], customValue: string) {
  if (selected.length === 0) return "Nothing selected yet";
  return selected.map((id) => {
    if (id === "custom") return customValue.trim() ? `Custom: ${customValue.trim()}` : "Custom (not filled in)";
    return options.find((option) => option.id === id)?.label ?? id;
  }).join(" · ");
}

function mergeCustomValues(childValue: string, parentValue: string) {
  return Array.from(new Set([childValue.trim(), parentValue.trim()].filter(Boolean))).join("; ");
}

function downloadFile(name: string, content: string, type: string) {
  const safeName = Array.from(name, (character) => character.charCodeAt(0) < 32 ? "-" : character)
    .join("")
    .replace(/[<>:"/\\|?*]/g, "-") || "brickbuddy-export";
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function BrickBuddyStudy() {
  const [data, setData] = useState<StudyState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [researcherOpen, setResearcherOpen] = useState(false);
  const [flowNavigationOpen, setFlowNavigationOpen] = useState(false);
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const currentFlowKey = data.stage === "scenario" ? `scenario-${data.scenarioIndex}` : data.stage;
  const currentFlowIndex = flowDestinations.findIndex((destination) => destination.key === currentFlowKey);
  const currentFlowLabel = flowDestinations[currentFlowIndex]?.label ?? "Current step";

  /* Browser storage is only available after the client mounts. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === 4) setData({
          ...initialState(),
          ...parsed,
          participant: {
            parentAge: "",
            ...parsed.participant,
            childGender: normalizeGender(parsed.participant?.childGender),
            parentGender: normalizeGender(parsed.participant?.parentGender),
          },
          aiFamiliarityNote: parsed.aiFamiliarityNote ?? "",
          parentRoles: parsed.parentRoles ?? (parsed.parentRole ? [parsed.parentRole] : []),
          controls: parsed.controls ?? [],
          controlCustom: parsed.controlCustom ?? "",
          voiceInterrupts: parsed.voiceInterrupts ?? [],
          voiceInterruptCustom: parsed.voiceInterruptCustom ?? "",
          parentControls: parsed.parentControls ?? [],
          parentControlCustom: parsed.parentControlCustom ?? "",
          parentVoiceInterrupts: parsed.parentVoiceInterrupts ?? [],
          parentVoiceInterruptCustom: parsed.parentVoiceInterruptCustom ?? "",
          parentHelpExpectation: parsed.parentHelpExpectation ?? "",
          finalControls: parsed.finalControls ?? [],
          finalControlCustom: parsed.finalControlCustom ?? "",
          finalVoiceInterrupts: parsed.finalVoiceInterrupts ?? [],
          finalVoiceInterruptCustom: parsed.finalVoiceInterruptCustom ?? "",
          openAnswers: parsed.openAnswers ?? {},
        });
        else if (parsed.version === 3) {
          setData({
            ...parsed,
            version: 4,
            participant: {
              parentAge: "",
              ...parsed.participant,
              childGender: normalizeGender(parsed.participant?.childGender),
              parentGender: normalizeGender(parsed.participant?.parentGender),
            },
            controls: parsed.controls ?? [],
            controlCustom: "",
            voiceInterrupts: [],
            voiceInterruptCustom: "",
            aiFamiliarityNote: parsed.aiFamiliarityNote ?? "",
            parentRoles: parsed.parentRoles ?? (parsed.parentRole ? [parsed.parentRole] : []),
            parentControls: parsed.parentControls ?? [],
            parentControlCustom: "",
            parentVoiceInterrupts: [],
            parentVoiceInterruptCustom: "",
            parentHelpExpectation: parsed.parentHelpExpectation ?? "",
            finalControls: parsed.finalControls ?? parsed.controls ?? [],
            finalControlCustom: "",
            finalVoiceInterrupts: [],
            finalVoiceInterruptCustom: "",
            openAnswers: parsed.openAnswers ?? {},
          });
        } else if (parsed.version === 2) {
          setData({
            ...parsed,
            version: 4,
            participant: {
              parentAge: "",
              ...parsed.participant,
              childGender: normalizeGender(parsed.participant?.childGender),
              parentGender: normalizeGender(parsed.participant?.parentGender),
            },
            parentRoles: parsed.parentRole ? [parsed.parentRole] : [],
            controls: parsed.controls ?? [],
            controlCustom: "",
            voiceInterrupts: [],
            voiceInterruptCustom: "",
            parentControls: [],
            parentControlCustom: "",
            parentVoiceInterrupts: [],
            parentVoiceInterruptCustom: "",
            parentHelpExpectation: "",
            finalControls: parsed.controls ?? [],
            finalControlCustom: "",
            finalVoiceInterrupts: [],
            finalVoiceInterruptCustom: "",
            aiFamiliarityNote: "",
            openAnswers: {},
          });
        } else window.localStorage.removeItem(STORAGE_KEY);
      } catch { /* keep a clean study */ }
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);

  const scenarioRules = useMemo(
    () => scenarios.map((scenario) => ({ id: scenario.id, text: buildRule(scenario.id, data.responses[scenario.id] ?? {}) })),
    [data.responses],
  );

  const logAndUpdate = (
    actor: LogEntry["actor"],
    action: string,
    value: string | undefined,
    updater: (current: StudyState) => StudyState,
  ) => {
    setData((current) => {
      const next = updater(current);
      return { ...next, logs: [...current.logs, { at: new Date().toISOString(), actor, action, value }] };
    });
  };

  const go = (stage: Stage, actor: LogEntry["actor"] = "researcher") =>
    logAndUpdate(actor, "navigate", stage, (current) => ({ ...current, stage }));

  const jumpTo = (destination: FlowDestination) => {
    setData((current) => ({
      ...current,
      stage: destination.stage,
      scenarioIndex: destination.scenarioIndex ?? current.scenarioIndex,
      scenarioStep: destination.scenarioStep ?? current.scenarioStep,
      logs: [...current.logs, { at: new Date().toISOString(), actor: "researcher", action: "flow-jump", value: destination.key }],
    }));
    setFlowNavigationOpen(false);
  };

  const moveWithinScenario = (scenarioIndex: number, scenarioStep: ScenarioStep) =>
    setData((current) => ({
      ...current,
      stage: "scenario",
      scenarioIndex,
      scenarioStep,
      logs: [...current.logs, { at: new Date().toISOString(), actor: "researcher", action: "scenario-navigation", value: `${scenarioIndex}:${scenarioStep}` }],
    }));

  const navigateBack = () => {
    if (data.stage === "scenario") {
      if (data.scenarioStep === "action") return moveWithinScenario(data.scenarioIndex, "intervention");
      if (data.scenarioStep === "length") return moveWithinScenario(data.scenarioIndex, "action");
      if (data.scenarioStep === "reason") {
        const intervention = data.responses[scenarios[data.scenarioIndex].id]?.intervention;
        return moveWithinScenario(data.scenarioIndex, intervention === "quiet" ? "intervention" : "length");
      }
    }
    const previous = flowDestinations[currentFlowIndex - 1];
    if (previous) jumpTo(previous);
  };

  const navigateNext = () => {
    if (data.stage === "scenario") {
      if (data.scenarioStep === "intervention") {
        const intervention = data.responses[scenarios[data.scenarioIndex].id]?.intervention;
        return moveWithinScenario(data.scenarioIndex, intervention === "quiet" ? "reason" : "action");
      }
      if (data.scenarioStep === "action") return moveWithinScenario(data.scenarioIndex, "length");
      if (data.scenarioStep === "length") return moveWithinScenario(data.scenarioIndex, "reason");
    }
    const next = flowDestinations[currentFlowIndex + 1];
    if (next) jumpTo(next);
  };

  const setResponse = (scenarioId: string, patch: ScenarioResponse) =>
    setData((current) => ({
      ...current,
      responses: { ...current.responses, [scenarioId]: { ...current.responses[scenarioId], ...patch } },
      logs: [...current.logs, { at: new Date().toISOString(), actor: "child", action: `scenario:${scenarioId}`, value: JSON.stringify(patch) }],
    }));

  const chooseIntervention = (value: Intervention) => {
    setData((current) => {
      const scenario = scenarios[current.scenarioIndex];
      const response = { ...current.responses[scenario.id], intervention: value };
      if (value === "quiet") {
        response.action = undefined;
        response.length = undefined;
      }
      return {
        ...current,
        responses: { ...current.responses, [scenario.id]: response },
        scenarioStep: value === "quiet" ? "reason" : "action",
        logs: [...current.logs, { at: new Date().toISOString(), actor: "child", action: `scenario:${scenario.id}:intervention`, value }],
      };
    });
  };

  const chooseAction = (value: string) => {
    const scenario = scenarios[data.scenarioIndex];
    setResponse(scenario.id, { action: value });
    setData((current) => ({ ...current, scenarioStep: "length" }));
  };

  const chooseLength = (value: string) => {
    setData((current) => {
      const scenario = scenarios[current.scenarioIndex];
      return {
        ...current,
        responses: { ...current.responses, [scenario.id]: { ...current.responses[scenario.id], length: value } },
        scenarioStep: "reason",
        logs: [...current.logs, { at: new Date().toISOString(), actor: "child", action: `scenario:${scenario.id}:length`, value }],
      };
    });
  };

  const setOpenReason = (reason: string) => {
    const scenario = scenarios[data.scenarioIndex];
    setData((current) => ({
      ...current,
      responses: { ...current.responses, [scenario.id]: { ...current.responses[scenario.id], reason } },
    }));
  };

  const finishOpenQuestion = () => {
    setData((current) => {
      const scenario = scenarios[current.scenarioIndex];
      const atLastScenario = current.scenarioIndex === scenarios.length - 1;
      return {
        ...current,
        scenarioIndex: atLastScenario ? current.scenarioIndex : current.scenarioIndex + 1,
        scenarioStep: "intervention",
        stage: atLastScenario ? "role" : current.stage,
        logs: [...current.logs, { at: new Date().toISOString(), actor: "researcher", action: `scenario:${scenario.id}:open-question`, value: current.responses[scenario.id]?.reason ?? "" }],
      };
    });
  };

  const toggleRole = (id: string) => {
    logAndUpdate("child", "toggle-role", id, (current) => {
      const exists = current.childRoles.includes(id);
      return { ...current, childRoles: exists ? current.childRoles.filter((item) => item !== id) : [...current.childRoles, id] };
    });
  };

  const toggleParentRole = (id: string) => {
    logAndUpdate("parent", "toggle-parent-role", id, (current) => {
      const exists = current.parentRoles.includes(id);
      return { ...current, parentRoles: exists ? current.parentRoles.filter((item) => item !== id) : [...current.parentRoles, id] };
    });
  };

  const toggleControl = (id: string) =>
    logAndUpdate("child", "toggle-control", id, (current) => ({
      ...current,
      controls: current.controls.includes(id) ? current.controls.filter((item) => item !== id) : [...current.controls, id],
    }));

  const toggleVoiceInterrupt = (id: string) =>
    logAndUpdate("child", "toggle-voice-interrupt", id, (current) => ({
      ...current,
      voiceInterrupts: current.voiceInterrupts.includes(id)
        ? current.voiceInterrupts.filter((item) => item !== id)
        : [...current.voiceInterrupts, id],
    }));

  const toggleParentControl = (id: string) =>
    logAndUpdate("parent", "toggle-parent-control", id, (current) => ({
      ...current,
      parentControls: current.parentControls.includes(id)
        ? current.parentControls.filter((item) => item !== id)
        : [...current.parentControls, id],
    }));

  const toggleParentVoiceInterrupt = (id: string) =>
    logAndUpdate("parent", "toggle-parent-voice-interrupt", id, (current) => ({
      ...current,
      parentVoiceInterrupts: current.parentVoiceInterrupts.includes(id)
        ? current.parentVoiceInterrupts.filter((item) => item !== id)
        : [...current.parentVoiceInterrupts, id],
    }));

  const childControlComplete = data.controls.length > 0
    && data.voiceInterrupts.length > 0
    && (!data.controls.includes("custom") || Boolean(data.controlCustom.trim()))
    && (!data.voiceInterrupts.includes("custom") || Boolean(data.voiceInterruptCustom.trim()));
  const parentControlComplete = data.parentControls.length > 0
    && data.parentVoiceInterrupts.length > 0
    && (!data.parentControls.includes("custom") || Boolean(data.parentControlCustom.trim()))
    && (!data.parentVoiceInterrupts.includes("custom") || Boolean(data.parentVoiceInterruptCustom.trim()));

  const sameChoices = (left: string[], right: string[]) =>
    left.length === right.length && left.every((item) => right.includes(item));

  const finishRoleNegotiation = (choice: NegotiationChoice) => {
    const finalRoles = choice === "agree"
      ? data.parentRoles
      : choice === "merge"
        ? Array.from(new Set([...data.childRoles, ...data.parentRoles]))
        : data.childRoles;
    const unresolved = choice === "keep" && !sameChoices(data.childRoles, data.parentRoles);
    logAndUpdate("family", "role-negotiation", choice, (current) => ({ ...current, negotiation: choice, finalRoles, unresolved, stage: "negotiate-control" }));
  };

  const finishControlNegotiation = (choice: NegotiationChoice) => {
    const finalControls = choice === "agree"
      ? data.parentControls
      : choice === "merge"
        ? Array.from(new Set([...data.controls, ...data.parentControls]))
        : data.controls;
    const finalVoiceInterrupts = choice === "agree"
      ? data.parentVoiceInterrupts
      : choice === "merge"
        ? Array.from(new Set([...data.voiceInterrupts, ...data.parentVoiceInterrupts]))
        : data.voiceInterrupts;
    const finalControlCustom = choice === "agree"
      ? data.parentControlCustom
      : choice === "merge"
        ? mergeCustomValues(data.controlCustom, data.parentControlCustom)
        : data.controlCustom;
    const finalVoiceInterruptCustom = choice === "agree"
      ? data.parentVoiceInterruptCustom
      : choice === "merge"
        ? mergeCustomValues(data.voiceInterruptCustom, data.parentVoiceInterruptCustom)
        : data.voiceInterruptCustom;
    const controlsUnresolved = choice === "keep" && (
      !sameChoices(data.controls, data.parentControls)
      || !sameChoices(data.voiceInterrupts, data.parentVoiceInterrupts)
      || data.controlCustom.trim() !== data.parentControlCustom.trim()
      || data.voiceInterruptCustom.trim() !== data.parentVoiceInterruptCustom.trim()
    );
    logAndUpdate("family", "control-negotiation", choice, (current) => ({
      ...current,
      controlNegotiation: choice,
      finalControls,
      finalControlCustom,
      finalVoiceInterrupts,
      finalVoiceInterruptCustom,
      unresolved: current.unresolved || controlsUnresolved,
      stage: "open-questions",
    }));
  };

  const finishOpenQuestions = () => {
    setData((current) => {
      const answerLogs: LogEntry[] = openQuestions
        .filter((question) => current.openAnswers[question.id]?.trim())
        .map((question) => ({
          at: new Date().toISOString(),
          actor: question.actor,
          action: `open-question:${question.id}`,
          value: current.openAnswers[question.id].trim(),
        }));
      return { ...current, stage: "complete", logs: [...current.logs, ...answerLogs] };
    });
  };

  const exportJson = () => {
    const childVersion = {
      roles: data.childRoles,
      buttonControls: data.controls,
      buttonControlCustom: data.controlCustom.trim() || null,
      voiceInterrupts: data.voiceInterrupts,
      voiceInterruptCustom: data.voiceInterruptCustom.trim() || null,
      scenarioRules,
    };
    const aiBackground = {
      familiarity: data.aiFamiliarity ?? null,
      familiarityLabel: aiFamiliarityOptions.find((option) => option.id === data.aiFamiliarity)?.label ?? null,
      doubaoCall: data.doubaoCall ?? null,
      doubaoCallLabel: doubaoCallOptions.find((option) => option.id === data.doubaoCall)?.label ?? null,
      note: data.aiFamiliarityNote.trim() || null,
    };
    const parentProposal = {
      roles: data.parentRoles,
      buttonControls: data.parentControls,
      buttonControlCustom: data.parentControlCustom.trim() || null,
      voiceInterrupts: data.parentVoiceInterrupts,
      voiceInterruptCustom: data.parentVoiceInterruptCustom.trim() || null,
      reason: data.parentReason || null,
      recordingPreference: data.parentRecordingPreference ?? null,
      recordingPreferenceLabel: parentRecordingOptions.find((option) => option.id === data.parentRecordingPreference)?.label ?? null,
      helpExpectation: data.parentHelpExpectation.trim() || null,
    };
    const openQuestionResponses = openQuestions.map((question) => ({
      id: question.id,
      dimension: question.dimension,
      audience: question.audience,
      question: question.question,
      probes: question.probes,
      answer: data.openAnswers[question.id]?.trim() || null,
    }));
    const actorLabels: Record<LogEntry["actor"], string> = { child: "Child", parent: "Parent", family: "Parent and child", researcher: "Researcher" };
    const stageLabels: Record<string, string> = { setup: "Study setup", practice: "Tap practice", oral: "Building interview", "ai-familiarity": "Experience with AI", scenario: "Scenario choices", role: "AI role choices", control: "Child control choices", "parent-role": "Parent role choices", "parent-control": "Parent control choices", "parent-expectations": "Parent expectations", negotiate: "Role negotiation", "negotiate-control": "Control negotiation", "open-questions": "Open-question interview", complete: "Complete" };
    const describeAction = (entry: LogEntry) => {
      if (entry.action === "navigate") return `Entered ${stageLabels[entry.value ?? ""] ?? entry.value ?? "the next"} stage`;
      if (entry.action === "flow-jump") return `Researcher used the study directory to jump to: ${flowDestinations.find((destination) => destination.key === entry.value)?.label ?? entry.value}`;
      if (entry.action === "scenario-navigation") return `Researcher changed the scenario page: ${entry.value}`;
      if (entry.action === "toggle-role") return `Selected or deselected AI role: ${roles.find((role) => role.id === entry.value)?.title ?? entry.value}`;
      if (entry.action === "toggle-control") return `Selected or deselected button control: ${controls.find((control) => control.id === entry.value)?.label ?? entry.value}`;
      if (entry.action === "toggle-voice-interrupt") return `Selected or deselected voice interruption: ${voiceInterrupts.find((control) => control.id === entry.value)?.label ?? entry.value}`;
      if (entry.action === "toggle-parent-role") return `Parent selected or deselected AI role: ${roles.find((role) => role.id === entry.value)?.title ?? entry.value}`;
      if (entry.action === "toggle-parent-control") return `Parent selected or deselected button control: ${controls.find((control) => control.id === entry.value)?.label ?? entry.value}`;
      if (entry.action === "toggle-parent-voice-interrupt") return `Parent selected or deselected voice interruption: ${voiceInterrupts.find((control) => control.id === entry.value)?.label ?? entry.value}`;
      if (entry.action === "parent-recording-preference") return `Parent’s process-recording preference: ${parentRecordingOptions.find((option) => option.id === entry.value)?.label ?? entry.value}`;
      if (entry.action === "ai-familiarity") return `Experience with AI: ${aiFamiliarityOptions.find((option) => option.id === entry.value)?.label ?? entry.value}`;
      if (entry.action === "doubao-call") return `Experience calling Doubao: ${doubaoCallOptions.find((option) => option.id === entry.value)?.label ?? entry.value}`;
      if (entry.action === "select-role") return `Parent selected AI role: ${roles.find((role) => role.id === entry.value)?.title ?? entry.value}`;
      if (entry.action === "role-negotiation") return `Parent and child decided on roles: ${entry.value === "agree" ? "use the parent’s proposal" : entry.value === "keep" ? "use the child’s proposal" : "merge both proposals"}`;
      if (entry.action === "control-negotiation") return `Parent and child decided on controls: ${entry.value === "agree" ? "use the parent’s proposal" : entry.value === "keep" ? "use the child’s proposal" : "merge both proposals"}`;
      if (entry.action.startsWith("open-question:")) {
        const questionId = entry.action.split(":")[1];
        return `Answered open question: ${openQuestions.find((question) => question.id === questionId)?.question ?? questionId}`;
      }
      if (entry.action.startsWith("scenario:")) {
        const [, scenarioId, step] = entry.action.split(":");
        const scenarioTitle = scenarios.find((scenario) => scenario.id === scenarioId)?.title ?? scenarioId;
        const stepLabel = step === "intervention" ? "chose how the AI should intervene" : step === "length" ? "chose how long the AI should speak" : step === "open-question" ? "recorded an open response" : "updated the scenario response";
        return `${scenarioTitle}: ${stepLabel}`;
      }
      return entry.action;
    };
    const actionLog = data.logs.map((entry, index) => ({
      no: index + 1,
      participantId: data.participant.id,
      actor: entry.actor,
      actorLabel: actorLabels[entry.actor],
      action: entry.action,
      actionLabel: describeAction(entry),
      value: entry.value ?? null,
      at: entry.at,
    }));
    const exportedAt = new Date().toISOString();
    const exportData = {
      ...data,
      exportInfo: {
        participantId: data.participant.id,
        participantNumber: data.participant.id,
        startedAt: data.startedAt,
        exportedAt,
      },
      childVersion,
      aiBackground,
      parentProposal,
      finalVersion: {
        roles: data.finalRoles,
        buttonControls: data.finalControls,
        buttonControlCustom: data.finalControlCustom.trim() || null,
        voiceInterrupts: data.finalVoiceInterrupts,
        voiceInterruptCustom: data.finalVoiceInterruptCustom.trim() || null,
        scenarioRules,
      },
      openQuestionResponses,
      actionLog,
      exportedAt,
    };
    downloadFile(`brickbuddy-${data.participant.id || "session"}.json`, JSON.stringify(exportData, null, 2), "application/json;charset=utf-8");
  };
  const exportCsv = () => {
    const rows = [["recordNo", "participantId", "childAge", "childGender", "parentAge", "parentGender", "parentEducation", "aiFamiliarity", "doubaoCall", "aiFamiliarityNote", "scenario", "childIntervention", "childRequestedAction", "childPreferredLength", "childOpenAnswer", "childScenarioRule", "childRoles", "childButtonControls", "childButtonControlCustom", "childVoiceInterrupts", "childVoiceInterruptCustom", "parentRoles", "parentButtonControls", "parentButtonControlCustom", "parentVoiceInterrupts", "parentVoiceInterruptCustom", "parentReason", "parentRecordingPreference", "parentHelpExpectation", "roleNegotiation", "controlNegotiation", "finalRoles", "finalButtonControls", "finalButtonControlCustom", "finalVoiceInterrupts", "finalVoiceInterruptCustom", "openTimingContrast", "openContentBoundary", "openControlRecovery", "openPriorityRule", "unresolved"]];
    scenarios.forEach((scenario, index) => {
      const response = data.responses[scenario.id] ?? {};
      rows.push([
        String(index + 1), data.participant.id, data.participant.age, data.participant.childGender ?? "", data.participant.parentAge, data.participant.parentGender ?? "", data.participant.parentEducation ?? "", data.aiFamiliarity ?? "", data.doubaoCall ?? "", data.aiFamiliarityNote, scenario.id, response.intervention ?? "", response.action ?? "", response.length ?? "", response.reason ?? "",
        buildRule(scenario.id, response), data.childRoles.join("|"), data.controls.join("|"), data.controlCustom, data.voiceInterrupts.join("|"), data.voiceInterruptCustom, data.parentRoles.join("|"), data.parentControls.join("|"), data.parentControlCustom, data.parentVoiceInterrupts.join("|"), data.parentVoiceInterruptCustom, data.parentReason, data.parentRecordingPreference ?? "", data.parentHelpExpectation, data.negotiation ?? "", data.controlNegotiation ?? "", data.finalRoles.join("|"), data.finalControls.join("|"), data.finalControlCustom, data.finalVoiceInterrupts.join("|"), data.finalVoiceInterruptCustom, data.openAnswers.timingContrast ?? "", data.openAnswers.contentBoundary ?? "", data.openAnswers.controlRecovery ?? "", data.openAnswers.priorityRule ?? "", String(data.unresolved),
      ]);
    });
    const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}`;
    downloadFile(`brickbuddy-${data.participant.id || "session"}.csv`, csv, "text/csv;charset=utf-8");
  };

  const reset = () => {
    if (!window.confirm("Start a new study session? The current record will be cleared.")) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setData(initialState());
    setResearcherOpen(false);
  };

  if (!hydrated) return <View style={styles.loading}><Text style={styles.loadingText}>BrickBuddy</Text></View>;

  const currentScenario = scenarios[data.scenarioIndex];
  const response = data.responses[currentScenario?.id] ?? {};
  const scenarioQuestion = data.scenarioStep === "intervention"
    ? `When ${currentScenario.context.toLowerCase()},\nwhat should the AI do?`
    : data.scenarioStep === "action"
      ? `When ${currentScenario.context.toLowerCase()},\nwhat should the AI help me with?`
      : data.scenarioStep === "length"
        ? `When ${currentScenario.context.toLowerCase()},\nhow much should the AI say?`
        : `When ${currentScenario.context.toLowerCase()},\nwhy do you want the AI to act this way?`;
  const scenarioHint = data.scenarioStep === "intervention"
    ? "Choose the one that best matches your idea"
    : data.scenarioStep === "action"
      ? "Choose the kind of help you want most right now"
      : data.scenarioStep === "length"
        ? "You can pause the voice at any time"
        : "Say your idea aloud and the researcher will write it down";

  return (
    <View style={styles.app}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}><View style={styles.brandStud} /><View style={styles.brandStud} /></View>
          <Text style={styles.brand}>BRICKBUDDY</Text>
        </View>
        {data.stage !== "setup" && data.stage !== "complete" && (
          <View style={styles.progressRow} accessibilityLabel="Study progress">
            {[0, 1, 2, 3].map((item) => <View key={item} style={[styles.progressDot, data.stage === "scenario" && item === data.scenarioIndex ? styles.progressDotActive : item < data.scenarioIndex || data.stage !== "scenario" ? styles.progressDotDone : null]} />)}
          </View>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Open researcher panel" onPress={() => { setFlowNavigationOpen(false); setResearcherOpen(true); }} style={({ pressed }: { pressed: boolean }) => [styles.researcherButton, pressed && styles.pressed]}>
          <Text style={styles.researcherButtonText}>Researcher</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {data.stage === "setup" && (
          <View style={styles.setupWrap}>
            <View style={styles.eyebrowPill}><Text style={styles.eyebrowText}>Family co-design · About 10 minutes</Text></View>
            <Text style={styles.heroTitle}>Let’s design an AI{compact ? "\n" : " "}<Text style={styles.heroAccent}>that understands you</Text></Text>
            <Text style={styles.heroSubtitle}>There are no right answers. The child chooses first; the parent joins later.</Text>
            <View style={[styles.setupCard, compact && styles.setupCardCompact]}>
              <View style={styles.formArea}>
                <Text style={styles.label}>Anonymous participant ID</Text>
                <TextInput value={data.participant.id} onChangeText={(id: string) => setData((current) => ({ ...current, participant: { ...current.participant, id } }))} placeholder="For example: C07" placeholderTextColor="#8A91A3" style={styles.input} accessibilityLabel="Anonymous participant ID" />
                <Text style={styles.label}>Child’s age (in years)</Text>
                <TextInput
                  value={data.participant.age}
                  onChangeText={(value: string) => {
                    const age = value.replace(/\D/g, "");
                    setData((current) => ({ ...current, participant: { ...current.participant, age } }));
                  }}
                  placeholder="For example: 8"
                  placeholderTextColor="#8A91A3"
                  inputMode="numeric"
                  style={styles.input}
                  accessibilityLabel="Child’s age in years"
                />
                <Text style={styles.label}>Child’s gender</Text>
                <View style={styles.demographicGrid}>
                  {childGenderOptions.map((option) => {
                    const selected = data.participant.childGender === option.id;
                    return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setData((current) => ({ ...current, participant: { ...current.participant, childGender: option.id } }))} style={[styles.demographicOption, selected && styles.demographicOptionSelected]}><Text style={[styles.demographicOptionText, selected && styles.demographicOptionTextSelected]}>{option.label}</Text></Pressable>;
                  })}
                </View>
                <View style={styles.setupDivider} />
                <Text style={styles.setupSectionTitle}>Parent information</Text>
                <Text style={styles.label}>Parent’s age (in years)</Text>
                <TextInput
                  value={data.participant.parentAge}
                  onChangeText={(value: string) => {
                    const parentAge = value.replace(/\D/g, "");
                    setData((current) => ({ ...current, participant: { ...current.participant, parentAge } }));
                  }}
                  placeholder="For example: 38"
                  placeholderTextColor="#8A91A3"
                  inputMode="numeric"
                  style={styles.input}
                  accessibilityLabel="Parent’s age in years"
                />
                <Text style={styles.label}>Parent’s gender</Text>
                <View style={styles.demographicGrid}>
                  {parentGenderOptions.map((option) => {
                    const selected = data.participant.parentGender === option.id;
                    return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setData((current) => ({ ...current, participant: { ...current.participant, parentGender: option.id } }))} style={[styles.demographicOption, selected && styles.demographicOptionSelected]}><Text style={[styles.demographicOptionText, selected && styles.demographicOptionTextSelected]}>{option.label}</Text></Pressable>;
                  })}
                </View>
                <Text style={styles.label}>Parent’s highest level of education</Text>
                <View style={styles.demographicGrid}>
                  {parentEducationOptions.map((option) => {
                    const selected = data.participant.parentEducation === option.id;
                    return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setData((current) => ({ ...current, participant: { ...current.participant, parentEducation: option.id } }))} style={[styles.demographicOption, styles.demographicOptionEducation, selected && styles.demographicOptionSelected]}><Text style={[styles.demographicOptionText, selected && styles.demographicOptionTextSelected]}>{option.label}</Text></Pressable>;
                  })}
                </View>
                <Pressable onPress={() => setData((current) => ({ ...current, participant: { ...current.participant, assisted: !current.participant.assisted } }))} style={styles.checkRow}>
                  <View style={[styles.checkbox, data.participant.assisted && styles.checkboxActive]}><Text style={styles.checkboxTick}>{data.participant.assisted ? "✓" : ""}</Text></View>
                  <Text style={styles.checkText}>Researcher will tap on the participant’s behalf</Text>
                </Pressable>
              </View>
              <View style={styles.setupVisual}>
                <BlockScene kind="welcome" color="#FFD54F" accent="#E6A800" />
              </View>
            </View>
            <PrimaryButton label="Start" onPress={() => go("practice")} disabled={!data.participant.id.trim() || !data.participant.age.trim() || !data.participant.childGender || !data.participant.parentAge.trim() || !data.participant.parentGender || !data.participant.parentEducation} />
          </View>
        )}

        {data.stage === "practice" && (
          <QuestionScreen eyebrow="Try it first" title="Choose a brick you like" subtitle="Just tap one. There is no right answer.">
            <View style={[styles.optionGrid, compact && styles.optionGridCompact]}>
              {[["#FFCF3D", "Yellow brick"], ["#4D9AFF", "Blue brick"]].map(([color, label]) => (
                <Pressable key={label} onPress={() => go("oral", "child")} style={({ pressed }: { pressed: boolean }) => [styles.practiceCard, { backgroundColor: color }, pressed && styles.cardPressed]}>
                  <View style={styles.practiceStudRow}><View style={styles.practiceStud} /><View style={styles.practiceStud} /></View>
                  <Text style={styles.practiceLabel}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </QuestionScreen>
        )}

        {data.stage === "oral" && (
          <QuestionScreen eyebrow="Face-to-face conversation · About 4 minutes" title="Let’s talk about your most recent build" subtitle="First listen to the child’s real experience, then ask the follow-up questions in order. There are no standard answers.">
            <View style={styles.promptCard}>
              <Text style={styles.promptNumber}>01</Text><Text style={styles.promptText}>Tell me about a recent build you remember well. Did you build it by yourself or with a parent?</Text>
              <View style={styles.promptLine} />
              <Text style={styles.promptNumber}>02 · Conversation</Text><Text style={styles.promptText}>While building, when do you want to talk to someone, share ideas, or discuss things together? What do you usually want to talk about?</Text>
              <View style={styles.promptLine} />
              <Text style={styles.promptNumber}>03 · Instructions</Text><Text style={styles.promptText}>What do you usually use to view building instructions: a paper booklet, digital instructions on a phone or tablet, or something else?</Text>
              <View style={styles.promptLine} />
              <Text style={styles.promptNumber}>04 · Order</Text><Text style={styles.promptText}>Do you usually follow the instructions one page at a time, or do you look ahead, go back, or skip around? Why?</Text>
              <View style={styles.promptLine} />
              <Text style={styles.promptNumber}>05 · Automatic page turning</Text><Text style={styles.promptText}>Would you like the instructions to turn to the next page automatically after you finish a step? When should they turn automatically, and when would you rather turn them yourself?</Text>
            </View>
            <PrimaryButton label="Ready" onPress={() => go("ai-familiarity")} />
          </QuestionScreen>
        )}

        {data.stage === "ai-familiarity" && (
          <QuestionScreen eyebrow="Before we begin" title="Have you encountered AI before?" subtitle="This is not a quiz. It is completely fine if you don’t know. The child should answer in their own words.">
            <View style={[styles.aiBackgroundGrid, compact && styles.optionGridCompact]}>
              <View style={styles.aiQuestionCard}>
                <Text style={styles.promptNumber}>01 · Experience with AI</Text>
                <Text style={styles.aiQuestionText}>Have you heard of or used AI (artificial intelligence) before?</Text>
                <View style={styles.choiceStack}>
                  {aiFamiliarityOptions.map((option) => (
                    <ChoiceButton key={option.id} label={option.label} hint={option.hint} symbol={option.symbol} compact selected={data.aiFamiliarity === option.id} onPress={() => logAndUpdate("child", "ai-familiarity", option.id, (current) => ({ ...current, aiFamiliarity: option.id }))} />
                  ))}
                </View>
              </View>
              <View style={styles.aiQuestionCard}>
                <Text style={styles.promptNumber}>02 · Experience with voice AI</Text>
                <Text style={styles.aiQuestionText}>Have you used Doubao’s “phone call” feature to talk with it?</Text>
                <View style={styles.choiceStack}>
                  {doubaoCallOptions.map((option) => (
                    <ChoiceButton key={option.id} label={option.label} hint={option.hint} symbol={option.symbol} compact selected={data.doubaoCall === option.id} onPress={() => logAndUpdate("child", "doubao-call", option.id, (current) => ({ ...current, doubaoCall: option.id }))} />
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.aiNoteCard}>
              <Text style={styles.openQuestionLabel}>Optional follow-up · Researcher takes notes</Text>
              <Text style={styles.aiNotePrompt}>What do you think AI is, or what can it do?</Text>
              <TextInput multiline value={data.aiFamiliarityNote} onChangeText={(aiFamiliarityNote: string) => setData((current) => ({ ...current, aiFamiliarityNote }))} placeholder="Leave blank if the child does not know. Record their own words as closely as possible…" placeholderTextColor="#8A91A3" style={styles.openQuestionInput} accessibilityLabel="Record the child’s understanding of AI" />
            </View>
            <View style={styles.neutralIntroCard}>
              <Text style={styles.neutralIntroLabel}>After both questions, the researcher reads this standard explanation</Text>
              <Text style={styles.neutralIntroText}>“The AI in the next part is a building assistant that can see where you are in your build and talk to you using its voice. Sometimes it may misunderstand what it sees or say something that does not fit.”</Text>
            </View>
            <PrimaryButton label="Got it, continue" onPress={() => go("scenario", "child")} disabled={!data.aiFamiliarity || !data.doubaoCall} />
          </QuestionScreen>
        )}

        {data.stage === "scenario" && (
          <View style={styles.scenarioWrap}>
            <View style={[styles.scenarioHero, compact && styles.scenarioHeroCompact]}>
              <View style={styles.scenarioVisualCol}>
                <View style={[styles.scenarioNumber, { backgroundColor: currentScenario.color }]}><Text style={styles.scenarioNumberText}>{currentScenario.number}</Text></View>
                <BlockScene kind={currentScenario.id} color={currentScenario.color} accent={currentScenario.accent} />
                <Text style={styles.scenarioLabel}>{currentScenario.title}</Text>
              </View>
              <View style={styles.scenarioQuestionCol}>
                <View style={[styles.contextStrip, { borderColor: currentScenario.accent }]}>
                  <View style={[styles.contextIcon, { backgroundColor: currentScenario.color }]}><Text style={styles.contextIconText}>{currentScenario.icon}</Text></View>
                  <View style={styles.contextCopy}><Text style={styles.contextLabel}>Current scenario · {currentScenario.title}</Text><Text style={styles.contextDescription}>{currentScenario.description}</Text></View>
                </View>
                <Text style={styles.smallEyebrow}>Scenario {data.scenarioIndex + 1}</Text>
                <Text style={styles.questionTitle}>{scenarioQuestion}</Text>
                <Text style={styles.questionHint}>{scenarioHint}</Text>
                <View style={styles.choiceStack}>
                  {data.scenarioStep === "intervention" && interventionOptions.map((option) => <ChoiceButton key={option.id} label={option.label} hint={option.hint} symbol={option.symbol} onPress={() => chooseIntervention(option.id)} />)}
                  {data.scenarioStep === "action" && actionOptions.map((option) => <ChoiceButton key={option.id} label={option.label} symbol={option.symbol} compact onPress={() => chooseAction(option.id)} />)}
                  {data.scenarioStep === "length" && lengthOptions.map((option) => <ChoiceButton key={option.id} label={option.label} hint={option.hint} symbol={option.id === "one" ? "1" : option.id === "short" ? "2" : "3"} onPress={() => chooseLength(option.id)} />)}
                  {data.scenarioStep === "reason" && (
                    <View style={styles.openQuestionCard}>
                      <View style={styles.openQuestionHeader}><View style={styles.speechMark}><Text style={styles.speechMarkText}>“</Text></View><Text style={styles.openQuestionLabel}>Child speaks · Researcher takes notes</Text></View>
                      <TextInput multiline value={response.reason ?? ""} onChangeText={setOpenReason} placeholder="For example: Because I want to try by myself first…" placeholderTextColor="#8A91A3" style={styles.openQuestionInput} accessibilityLabel="Record the child’s open response" />
                      <PrimaryButton label={data.scenarioIndex === scenarios.length - 1 ? "Finished, continue" : "Finished, next scenario"} onPress={finishOpenQuestion} />
                    </View>
                  )}
                </View>
                {data.scenarioStep !== "intervention" && <Pressable onPress={() => setData((current) => ({ ...current, scenarioStep: current.scenarioStep === "reason" ? (response.intervention === "quiet" ? "intervention" : "length") : current.scenarioStep === "length" ? "action" : "intervention" }))} style={styles.backButton}><Text style={styles.backButtonText}>← Back to the previous question</Text></Pressable>}
              </View>
            </View>
          </View>
        )}

        {data.stage === "role" && (
          <QuestionScreen eyebrow="Child chooses first" title="If AI joined you, what should it be like?" subtitle={`Choose more than one if you like · ${data.childRoles.length} role(s) selected`}>
            <View style={styles.roleGrid}>
              {roles.map((role) => (
                <RoleCard key={role.id} role={role} selected={data.childRoles.includes(role.id)} onPress={() => toggleRole(role.id)} />
              ))}
            </View>
            <PrimaryButton label="Done choosing" onPress={() => go("control", "child")} disabled={data.childRoles.length === 0} />
          </QuestionScreen>
        )}

        {data.stage === "control" && (
          <QuestionScreen dense eyebrow="Listen to the child first" title="When the AI is speaking, I most need…" subtitle={`Choose button and voice controls separately; multiple choices are welcome · ${data.controls.length} button(s) · ${data.voiceInterrupts.length} voice command(s)`}>
            <ControlChoiceSection
              title="① Button controls"
              hint="Which button would I press?"
              options={controls}
              selected={data.controls}
              onToggle={toggleControl}
              customValue={data.controlCustom}
              onCustomChange={(controlCustom) => setData((current) => ({ ...current, controlCustom }))}
              customPlaceholder="For example: Go back one step"
              customAccessibilityLabel="Child’s custom button control"
              tone="button"
              compact={compact}
            />
            <ControlChoiceSection
              title="② Voice interruptions"
              hint="What would I say?"
              options={voiceInterrupts}
              selected={data.voiceInterrupts}
              onToggle={toggleVoiceInterrupt}
              customValue={data.voiceInterruptCustom}
              onCustomChange={(voiceInterruptCustom) => setData((current) => ({ ...current, voiceInterruptCustom }))}
              customPlaceholder="For example: Please stop talking"
              customAccessibilityLabel="Child’s custom voice interruption"
              tone="voice"
              compact={compact}
            />
            <PrimaryButton label="Invite the parent to join" onPress={() => go("parent-role", "parent")} disabled={!childControlComplete} />
          </QuestionScreen>
        )}

        {data.stage === "parent-role" && (
          <QuestionScreen eyebrow="Now the parent chooses" title="What would you like the AI to be like?" subtitle={`Choose more than one if you like · ${data.parentRoles.length} role(s) selected. The child’s choices will be kept.`}>
            <View style={[styles.childChoiceStrip, !compact && styles.childChoiceStripWide]}>
              <Text style={[styles.originalLabel, !compact && styles.originalLabelInline]}>The child chose</Text>
              <View style={styles.roleChipRow}>{data.childRoles.map((id) => <View key={id} style={styles.roleChip}><Text style={styles.roleChipText}>{roles.find((role) => role.id === id)?.title}</Text></View>)}</View>
            </View>
            <View style={styles.parentRoleGrid}>
              {roles.map((role) => <RoleCard key={role.id} role={role} compact selected={data.parentRoles.includes(role.id)} onPress={() => toggleParentRole(role.id)} />)}
            </View>
            <PrimaryButton label="Continue to controls" onPress={() => go("parent-control", "parent")} disabled={data.parentRoles.length === 0} />
          </QuestionScreen>
        )}

        {data.stage === "parent-control" && (
          <QuestionScreen dense eyebrow="Now the parent chooses" title="When the AI is speaking, the child most needs…" subtitle={`Choose button and voice controls separately; multiple choices are welcome · ${data.parentControls.length} button(s) · ${data.parentVoiceInterrupts.length} voice command(s)`}>
            <View style={[styles.childChoiceStrip, !compact && styles.childChoiceStripWide]}>
              <Text style={[styles.originalLabel, !compact && styles.originalLabelInline]}>The child chose</Text>
              <View style={styles.childControlSummary}>
                <Text style={styles.childControlSummaryLabel}>Buttons</Text>
                <Text style={styles.childControlSummaryText}>{summarizeControlChoices(controls, data.controls, data.controlCustom)}</Text>
              </View>
              <View style={styles.childControlSummary}>
                <Text style={styles.childControlSummaryLabel}>Voice</Text>
                <Text style={styles.childControlSummaryText}>{summarizeControlChoices(voiceInterrupts, data.voiceInterrupts, data.voiceInterruptCustom)}</Text>
              </View>
            </View>
            <ControlChoiceSection
              title="① Button controls"
              hint="Which button should the child press?"
              options={controls}
              selected={data.parentControls}
              onToggle={toggleParentControl}
              customValue={data.parentControlCustom}
              onCustomChange={(parentControlCustom) => setData((current) => ({ ...current, parentControlCustom }))}
              customPlaceholder="For example: Go back one step"
              customAccessibilityLabel="Parent’s custom button control"
              tone="button"
              compact={compact}
            />
            <ControlChoiceSection
              title="② Voice interruptions"
              hint="What should the child say?"
              options={voiceInterrupts}
              selected={data.parentVoiceInterrupts}
              onToggle={toggleParentVoiceInterrupt}
              customValue={data.parentVoiceInterruptCustom}
              onCustomChange={(parentVoiceInterruptCustom) => setData((current) => ({ ...current, parentVoiceInterruptCustom }))}
              customPlaceholder="For example: Please stop talking"
              customAccessibilityLabel="Parent’s custom voice interruption"
              tone="voice"
              compact={compact}
            />
            <PrimaryButton label="Continue to parent questions" onPress={() => go("parent-expectations", "parent")} disabled={!parentControlComplete} />
          </QuestionScreen>
        )}

        {data.stage === "parent-expectations" && (
          <QuestionScreen eyebrow="Parent’s input" title="What should the AI record and help with?" subtitle="First record the parent’s ideas. The parent and child will still decide on the final design together.">
            <View style={styles.parentExpectationCard}>
              <Text style={styles.promptNumber}>01 · Recording the process</Text>
              <Text style={styles.parentExpectationQuestion}>Would you like the AI to record your child’s building process?</Text>
              <Text style={styles.parentExpectationHint}>Here, “record” means saving building steps, difficulties, or progress on the creation. It does not mean sharing them publicly.</Text>
              <View style={[styles.recordingChoiceGrid, compact && styles.optionGridCompact]}>
                {parentRecordingOptions.map((option) => (
                  <View key={option.id} style={[styles.recordingChoice, compact && styles.recordingChoiceCompact]}>
                    <ChoiceButton label={option.label} hint={option.hint} symbol={option.symbol} compact selected={data.parentRecordingPreference === option.id} onPress={() => logAndUpdate("parent", "parent-recording-preference", option.id, (current) => ({ ...current, parentRecordingPreference: option.id }))} />
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.parentExpectationCard}>
              <Text style={styles.promptNumber}>02 · Expectations for help</Text>
              <Text style={styles.parentExpectationQuestion}>What kind of help would you most like the AI to give your child? Why?</Text>
              <Text style={styles.parentExpectationHint}>You might discuss step prompts, troubleshooting, explanations, encouragement, independent thinking, or other kinds of help.</Text>
              <TextInput multiline value={data.parentHelpExpectation} onChangeText={(parentHelpExpectation: string) => setData((current) => ({ ...current, parentHelpExpectation }))} placeholder="Record the parent’s own words and concrete examples as closely as possible…" placeholderTextColor="#8A91A3" style={styles.openQuestionInput} accessibilityLabel="Record the parent’s expectations for AI help" />
            </View>
            <PrimaryButton label="Invite the child back to decide together" onPress={() => go("negotiate", "parent")} disabled={!data.parentRecordingPreference || !data.parentHelpExpectation.trim()} />
          </QuestionScreen>
        )}

        {data.stage === "negotiate" && (
          <QuestionScreen eyebrow="Decide together · Question 1" title="How should we decide the AI’s final roles?" subtitle="The parent and child should decide together. Different opinions are important too.">
            <View style={styles.negotiationBoard}>
              <View style={[styles.compareRow, compact && styles.compareRowCompact]}>
                <View style={styles.childCard}><Text style={styles.compareTag}>Child’s choices</Text><Text style={styles.compareText}>{data.childRoles.map((id) => roles.find((role) => role.id === id)?.title).join(" + ")}</Text></View>
                <View style={styles.compareJoin}><Text style={styles.compareJoinText}>⇄</Text><Text style={styles.compareJoinLabel}>Discuss</Text></View>
                <View style={styles.parentCard}><Text style={[styles.compareTag, styles.parentTag]}>Parent’s choices</Text><Text style={styles.compareText}>{data.parentRoles.map((id) => roles.find((role) => role.id === id)?.title).join(" + ")}</Text></View>
              </View>
            </View>
            <View style={[styles.negotiationGrid, compact && styles.optionGridCompact]}>
              <View style={[styles.negotiationOption, compact && styles.negotiationOptionCompact]}><ChoiceButton label="Use the parent’s" hint="Keep the parent’s proposal" symbol="✓" onPress={() => finishRoleNegotiation("agree")} /></View>
              <View style={[styles.negotiationOption, compact && styles.negotiationOptionCompact]}><ChoiceButton label="Use the child’s" hint="Keep the child’s proposal" symbol="★" onPress={() => finishRoleNegotiation("keep")} /></View>
              <View style={[styles.negotiationOption, compact && styles.negotiationOptionCompact]}><ChoiceButton label="Combine them" hint="Keep roles from both proposals" symbol="+" onPress={() => finishRoleNegotiation("merge")} /></View>
            </View>
          </QuestionScreen>
        )}

        {data.stage === "negotiate-control" && (
          <QuestionScreen eyebrow="Decide together · Question 2" title="When the AI is speaking, we most need…" subtitle="The parent and child should decide together which button controls and voice interruptions to keep.">
            <View style={styles.negotiationBoard}>
              <View style={[styles.compareRow, compact && styles.compareRowCompact]}>
                <View style={styles.childCard}>
                  <Text style={styles.compareTag}>Child’s choices</Text>
                  <View style={styles.compareChoiceGroup}><Text style={styles.compareChoiceLabel}>Button controls</Text><Text style={styles.compareText}>{summarizeControlChoices(controls, data.controls, data.controlCustom)}</Text></View>
                  <View style={styles.compareChoiceGroup}><Text style={styles.compareChoiceLabel}>Voice interruptions</Text><Text style={styles.compareText}>{summarizeControlChoices(voiceInterrupts, data.voiceInterrupts, data.voiceInterruptCustom)}</Text></View>
                </View>
                <View style={styles.compareJoin}><Text style={styles.compareJoinText}>⇄</Text><Text style={styles.compareJoinLabel}>Decide together</Text></View>
                <View style={styles.parentCard}>
                  <Text style={[styles.compareTag, styles.parentTag]}>Parent’s choices</Text>
                  <View style={styles.compareChoiceGroup}><Text style={styles.compareChoiceLabel}>Button controls</Text><Text style={styles.compareText}>{summarizeControlChoices(controls, data.parentControls, data.parentControlCustom)}</Text></View>
                  <View style={styles.compareChoiceGroup}><Text style={styles.compareChoiceLabel}>Voice interruptions</Text><Text style={styles.compareText}>{summarizeControlChoices(voiceInterrupts, data.parentVoiceInterrupts, data.parentVoiceInterruptCustom)}</Text></View>
                </View>
              </View>
            </View>
            <View style={[styles.negotiationGrid, compact && styles.optionGridCompact]}>
              <View style={[styles.negotiationOption, compact && styles.negotiationOptionCompact]}><ChoiceButton label="Use the parent’s" hint="Keep the parent’s proposal" symbol="✓" onPress={() => finishControlNegotiation("agree")} /></View>
              <View style={[styles.negotiationOption, compact && styles.negotiationOptionCompact]}><ChoiceButton label="Use the child’s" hint="Keep the child’s proposal" symbol="★" onPress={() => finishControlNegotiation("keep")} /></View>
              <View style={[styles.negotiationOption, compact && styles.negotiationOptionCompact]}><ChoiceButton label="Combine them" hint="Keep choices from both proposals" symbol="+" onPress={() => finishControlNegotiation("merge")} /></View>
            </View>
          </QuestionScreen>
        )}

        {data.stage === "open-questions" && (
          <QuestionScreen eyebrow="Semi-structured interview · About 5–8 minutes" title="Tell us more about why you designed it this way" subtitle="Ask each main question in order. Use the prompts below only when they fit the answer; you do not need to ask all of them. The child answers first, then the parent adds observations.">
            <View style={styles.finalQuestionList}>
              {openQuestions.map((question, index) => (
                <View key={question.id} style={styles.finalQuestionCard}>
                  <View style={styles.finalQuestionHeader}>
                    <Text style={styles.finalQuestionNumber}>Q{index + 1}</Text>
                    <Text style={styles.finalQuestionDimension}>{question.dimension}</Text>
                    <Text style={styles.finalQuestionAudience}>{question.audience}</Text>
                  </View>
                  <Text style={styles.finalQuestionText}>{question.question}</Text>
                  <View style={styles.probeBox}>
                    <Text style={styles.probeLabel}>Optional prompts</Text>
                    {question.probes.map((probe) => <Text key={probe} style={styles.probeText}>• {probe}</Text>)}
                  </View>
                  <TextInput
                    multiline
                    value={data.openAnswers[question.id] ?? ""}
                    onChangeText={(answer: string) => setData((current) => ({ ...current, openAnswers: { ...current.openAnswers, [question.id]: answer } }))}
                    placeholder={question.placeholder}
                    placeholderTextColor="#8A91A3"
                    style={styles.finalQuestionInput}
                    accessibilityLabel={`Record the answer to open question ${index + 1}`}
                  />
                </View>
              ))}
            </View>
            <PrimaryButton label="Finish the interview" onPress={finishOpenQuestions} />
          </QuestionScreen>
        )}

        {data.stage === "complete" && (
          <View style={styles.completeWrap}>
            <View style={styles.completeBadge}><Text style={styles.completeBadgeText}>Complete</Text></View>
            <Text style={styles.completeTitle}>This is the AI we designed together</Text>
            <Text style={styles.completeSubtitle}>{data.unresolved ? "We kept our different ideas, and that matters too." : "Thank you for sharing your ideas."}</Text>
            <View style={styles.participantNumberCard}><Text style={styles.participantNumberLabel}>Participant ID</Text><Text style={styles.participantNumberValue}>{data.participant.id}</Text></View>
            <View style={styles.finalRules}>
              <View style={styles.finalRoleBlock}><Text style={styles.finalControlLabel}>AI roles</Text><View style={styles.roleChipRow}>{data.finalRoles.map((id) => <View key={id} style={styles.finalRoleChip}><Text style={styles.finalRoleChipText}>{roles.find((role) => role.id === id)?.title}</Text></View>)}</View></View>
              <View style={styles.finalControl}><Text style={styles.finalControlLabel}>Button controls</Text><Text style={styles.finalControlValue}>{summarizeControlChoices(controls, data.finalControls, data.finalControlCustom)}</Text></View>
              <View style={styles.finalControl}><Text style={styles.finalControlLabel}>Voice interruptions</Text><Text style={styles.finalControlValue}>{summarizeControlChoices(voiceInterrupts, data.finalVoiceInterrupts, data.finalVoiceInterruptCustom)}</Text></View>
            </View>
            <View style={styles.exportRow}>
              <PrimaryButton label="Export JSON" onPress={exportJson} secondary />
              <PrimaryButton label="Export CSV" onPress={exportCsv} secondary />
              <PrimaryButton label="New session" onPress={reset} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.flowNavBar} accessibilityLabel="Researcher study navigation">
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: currentFlowIndex <= 0 }} disabled={currentFlowIndex <= 0} onPress={navigateBack} style={[styles.flowNavButton, currentFlowIndex <= 0 && styles.flowNavButtonDisabled]}>
          <Text style={styles.flowNavButtonText}>← Previous</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open study directory" onPress={() => { setResearcherOpen(false); setFlowNavigationOpen(true); }} style={styles.flowNavCenter}>
          <Text style={styles.flowNavEyebrow}>Researcher navigation · {currentFlowIndex + 1}/{flowDestinations.length}</Text>
          <Text style={styles.flowNavCurrent}>{currentFlowLabel}</Text>
          <Text style={styles.flowNavDirectory}>Tap to open the study directory</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: currentFlowIndex >= flowDestinations.length - 1 }} disabled={currentFlowIndex >= flowDestinations.length - 1} onPress={navigateNext} style={[styles.flowNavButton, currentFlowIndex >= flowDestinations.length - 1 && styles.flowNavButtonDisabled]}>
          <Text style={styles.flowNavButtonText}>Next →</Text>
        </Pressable>
      </View>

      {flowNavigationOpen && (
        <View style={styles.flowOverlay}>
          <Pressable style={styles.flowDismiss} onPress={() => setFlowNavigationOpen(false)} accessibilityLabel="Close study directory" />
          <View style={[styles.flowMenu, compact && styles.flowMenuCompact]}>
            <View style={styles.panelHeader}><View><Text style={styles.flowMenuTitle}>Study directory</Text><Text style={styles.flowMenuSubtitle}>Jump to any step without clearing completed answers</Text></View><Pressable onPress={() => setFlowNavigationOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
            <ScrollView style={styles.flowMenuScroll}>
              <View style={styles.flowMenuList}>
                {flowDestinations.map((destination) => {
                  const active = destination.key === currentFlowKey;
                  return (
                    <Pressable key={destination.key} accessibilityRole="button" onPress={() => jumpTo(destination)} style={[styles.flowMenuItem, active && styles.flowMenuItemActive]}>
                      <Text style={[styles.flowMenuItemText, active && styles.flowMenuItemTextActive]}>{destination.label}</Text>
                      <Text style={[styles.flowMenuItemArrow, active && styles.flowMenuItemTextActive]}>{active ? "Current" : "→"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {researcherOpen && (
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setResearcherOpen(false)} accessibilityLabel="Close researcher panel" />
          <View style={[styles.researcherPanel, compact && styles.researcherPanelCompact]}>
            <View style={styles.panelHeader}><Text style={styles.panelTitle}>Researcher panel</Text><Pressable onPress={() => setResearcherOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
            <Text style={styles.panelMeta}>ID {data.participant.id || "Not entered"} · Current stage: {data.stage}</Text>
            <Text style={styles.panelLabel}>Notes on the recent building experience</Text>
            <TextInput multiline value={data.oralNote} onChangeText={(oralNote: string) => setData((current) => ({ ...current, oralNote }))} placeholder="Record only anonymous, necessary information…" placeholderTextColor="#8A91A3" style={[styles.input, styles.textarea]} />
            {data.stage === "scenario" && (
              <><Text style={styles.panelLabel}>Reason given for this scenario</Text><TextInput multiline value={response.reason ?? ""} onChangeText={(reason: string) => setResponse(currentScenario.id, { reason })} placeholder="Why did the child choose this?" placeholderTextColor="#8A91A3" style={[styles.input, styles.textarea]} /></>
            )}
            {(["parent-role", "parent-control", "parent-expectations", "negotiate", "negotiate-control"] as Stage[]).includes(data.stage) && (
              <><Text style={styles.panelLabel}>Parent’s reason for changing it</Text><TextInput multiline value={data.parentReason} onChangeText={(parentReason: string) => setData((current) => ({ ...current, parentReason }))} placeholder="Why does the parent want to change it?" placeholderTextColor="#8A91A3" style={[styles.input, styles.textarea]} /></>
            )}
            <View style={styles.panelStats}><View><Text style={styles.statNumber}>{data.logs.length}</Text><Text style={styles.statLabel}>actions</Text></View><View><Text style={styles.statNumber}>{Object.keys(data.responses).length}/4</Text><Text style={styles.statLabel}>scenarios complete</Text></View></View>
            <Pressable onPress={exportJson} style={styles.panelAction}><Text style={styles.panelActionText}>Export current record</Text></Pressable>
            <Pressable onPress={reset} style={styles.panelDanger}><Text style={styles.panelDangerText}>Clear and start a new session</Text></Pressable>
            <Text style={styles.privacyNote}>Data stays in this browser. No audio, photos, or uploads.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function QuestionScreen({ eyebrow, title, subtitle, children, dense }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode; dense?: boolean }) {
  return <View style={[styles.questionScreen, dense && styles.questionScreenDense]}><Text style={styles.smallEyebrow}>{eyebrow}</Text><Text style={[styles.centerTitle, dense && styles.centerTitleDense]}>{title}</Text><Text style={[styles.centerSubtitle, dense && styles.centerSubtitleDense]}>{subtitle}</Text>{children}</View>;
}

function ControlChoiceSection({
  title,
  hint,
  options,
  selected,
  onToggle,
  customValue,
  onCustomChange,
  customPlaceholder,
  customAccessibilityLabel,
  tone,
  compact,
}: {
  title: string;
  hint: string;
  options: ControlOption[];
  selected: string[];
  onToggle: (id: string) => void;
  customValue: string;
  onCustomChange: (value: string) => void;
  customPlaceholder: string;
  customAccessibilityLabel: string;
  tone: "button" | "voice";
  compact: boolean;
}) {
  return (
    <View style={[styles.controlSection, tone === "button" ? styles.controlSectionButton : styles.controlSectionVoice]}>
      <View style={[styles.controlSectionMain, compact && styles.controlSectionMainCompact]}>
        <View style={[styles.controlSectionHeader, compact && styles.controlSectionHeaderCompact]}>
          <Text style={styles.controlSectionTitle}>{title}</Text>
          <Text style={styles.controlSectionHint}>{hint}</Text>
          <Text style={styles.controlSectionMulti}>Choose more than one</Text>
        </View>
        <View style={styles.controlGrid}>
          {options.map((option) => {
            const isSelected = selected.includes(option.id);
            const OptionIcon = option.icon;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => onToggle(option.id)}
                style={({ pressed }: { pressed: boolean }) => [
                  styles.controlCard,
                  compact && styles.controlCardCompact,
                  isSelected && (tone === "button" ? styles.controlCardSelectedButton : styles.controlCardSelectedVoice),
                  pressed && styles.controlCardPressed,
                ]}
              >
                <View style={[styles.controlIconWrap, tone === "button" ? styles.controlIconWrapButton : styles.controlIconWrapVoice, isSelected && styles.controlIconWrapSelected]}>
                  <OptionIcon size={28} strokeWidth={2.6} color="#17233D" aria-hidden="true" />
                </View>
                <Text style={[styles.controlLabel, isSelected && styles.controlLabelSelected]}>{option.label}</Text>
                <View style={[styles.controlSelectionDot, isSelected && styles.controlSelectionDotSelected]} />
              </Pressable>
            );
          })}
        </View>
      </View>
      {selected.includes("custom") && (
        <View style={[styles.customControlEditor, !compact && styles.customControlEditorWide]}>
          <Text style={styles.customControlPrompt}>Say your idea aloud and the researcher can write it down</Text>
          <TextInput
            value={customValue}
            onChangeText={onCustomChange}
            placeholder={customPlaceholder}
            placeholderTextColor="#8A91A3"
            style={styles.customControlInput}
            accessibilityLabel={customAccessibilityLabel}
          />
        </View>
      )}
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled, secondary }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }: { pressed: boolean }) => [styles.primaryButton, secondary && styles.secondaryButton, disabled && styles.disabledButton, pressed && !disabled && styles.pressed]}><Text style={[styles.primaryButtonText, secondary && styles.secondaryButtonText]}>{label}<Text>  →</Text></Text></Pressable>;
}

function ChoiceButton({ label, hint, symbol, onPress, compact, selected }: { label: string; hint?: string; symbol: string; onPress: () => void; compact?: boolean; selected?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }: { pressed: boolean }) => [styles.choiceButton, compact && styles.choiceButtonCompact, selected && styles.choiceButtonSelected, pressed && styles.cardPressed]}><View style={[styles.choiceSymbol, selected && styles.choiceSymbolSelected]}><Text style={styles.choiceSymbolText}>{symbol}</Text></View><View style={styles.choiceCopy}><Text style={styles.choiceLabel}>{label}</Text>{hint && <Text style={styles.choiceHint}>{hint}</Text>}</View><Text style={styles.choiceArrow}>{selected ? "✓" : "→"}</Text></Pressable>;
}

function RoleCard({ role, selected, onPress, compact }: { role: (typeof roles)[number]; selected: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.roleCard, compact && styles.roleCardCompact, selected && styles.roleCardSelected]}>
      <View style={[styles.roleSymbol, { backgroundColor: role.color }]}><Text style={styles.roleSymbolText}>{role.symbol}</Text></View>
      <View style={styles.roleCopy}><Text style={styles.roleTitle}>{role.title}</Text><Text style={styles.roleSubtitle}>{role.subtitle}</Text></View>
      <View style={[styles.roleCheck, selected && styles.roleCheckSelected]}><Text style={styles.roleCheckText}>{selected ? "✓" : ""}</Text></View>
    </Pressable>
  );
}

function BlockScene({ kind, color, accent }: { kind: string; color: string; accent: string }) {
  const captions: Record<string, string> = { find: "Can’t find it", build: "Building", done: "Done!", stuck: "A mistake?", welcome: "Design together" };
  return (
    <View style={[styles.scene, { backgroundColor: `${color}33` }]} accessibilityLabel="Brick-building scenario illustration">
      <View style={styles.sceneCaption}><Text style={styles.sceneCaptionText}>{captions[kind]}</Text></View>
      <View style={styles.sceneTable} />
      <View style={[styles.sceneBlock, styles.sceneBlockOne, { backgroundColor: color }]}><View style={styles.stud} /><View style={[styles.stud, { left: 54 }]} /></View>
      <View style={[styles.sceneBlock, styles.sceneBlockTwo, { backgroundColor: accent }]}><View style={styles.stud} /></View>
      <View style={[styles.sceneBlock, styles.sceneBlockThree, { backgroundColor: "#4D9AFF" }]}><View style={styles.stud} /><View style={[styles.stud, { left: 54 }]} /></View>
      {kind !== "welcome" && <View style={styles.childFigure}><View style={styles.childHead}><View style={styles.childEye} /><View style={[styles.childEye, { right: 12, left: "auto" as never }]} /></View><View style={[styles.childBody, { backgroundColor: color }]} /></View>}
      {kind === "find" && <><View style={styles.thoughtBubble}><Text style={styles.thoughtText}>?</Text><View style={styles.miniBrick} /></View><View style={styles.magnifyRing} /><View style={styles.magnifyHandle} /></>}
      {kind === "build" && <><View style={styles.focusBubble}><Text style={styles.focusDots}>•••</Text><View style={styles.muteSlash} /></View><View style={styles.handShape}><View style={styles.fingerOne} /><View style={styles.fingerTwo} /></View></>}
      {kind === "done" && <><View style={styles.stepArrow}><Text style={styles.stepArrowText}>1 → 2</Text></View><View style={[styles.sceneBadge, { backgroundColor: accent }]}><Text style={styles.sceneBadgeText}>✓</Text></View></>}
      {kind === "stuck" && <><View style={styles.wrongBlock}><View style={styles.wrongStud} /><Text style={styles.wrongMark}>×</Text></View><View style={[styles.sceneBadge, { backgroundColor: accent }]}><Text style={styles.sceneBadgeText}>!</Text></View></>}
      {kind === "welcome" && <View style={[styles.sceneBadge, { backgroundColor: "#17233D" }]}><Text style={styles.sceneBadgeText}>✦</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  app: { minHeight: "100vh", backgroundColor: "#F7F4EC" },
  loading: { minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#FFD54F" },
  loadingText: { fontSize: 24, fontWeight: "900", letterSpacing: 2, color: "#17233D" },
  topBar: { height: 76, paddingHorizontal: 28, backgroundColor: "#FFFDF8", borderBottomWidth: 1, borderBottomColor: "#DED8CA", flexDirection: "row", alignItems: "center", justifyContent: "space-between", position: "sticky" as never, top: 0, zIndex: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 30, height: 24, backgroundColor: "#FFD54F", borderRadius: 4, flexDirection: "row", gap: 4, paddingHorizontal: 5 },
  brandStud: { width: 8, height: 5, borderRadius: 3, backgroundColor: "#E6A800", marginTop: -4 },
  brand: { fontWeight: "900", fontSize: 17, letterSpacing: 1.5, color: "#17233D" },
  progressRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  progressDot: { width: 30, height: 6, borderRadius: 3, backgroundColor: "#DDD7C9" },
  progressDotActive: { width: 52, backgroundColor: "#17233D" },
  progressDotDone: { backgroundColor: "#7BB7FF" },
  researcherButton: { borderWidth: 1, borderColor: "#C9C3B7", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  researcherButtonText: { color: "#51596B", fontSize: 14, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { minHeight: "calc(100vh - 76px)" as never, paddingHorizontal: 24, paddingTop: 34, paddingBottom: 140 },
  flowNavBar: { position: "fixed" as never, left: "50%", bottom: 14, zIndex: 30, width: "calc(100% - 32px)" as never, maxWidth: 900, minHeight: 84, transform: [{ translateX: "-50%" as never }], flexDirection: "row", alignItems: "stretch", backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#17233D", borderRadius: 18, padding: 8, gap: 8, boxShadow: "0 8px 28px rgba(23,35,61,0.22)" as never },
  flowNavButton: { minWidth: 142, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#17233D", alignItems: "center", justifyContent: "center" },
  flowNavButtonDisabled: { opacity: 0.28 },
  flowNavButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  flowNavCenter: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  flowNavEyebrow: { fontSize: 11, fontWeight: "900", color: "#2F6FC2", letterSpacing: 0.7 },
  flowNavCurrent: { fontSize: 16, lineHeight: 23, fontWeight: "900", color: "#17233D", textAlign: "center" },
  flowNavDirectory: { fontSize: 11, color: "#687083", marginTop: 1 },
  flowOverlay: { position: "fixed" as never, inset: 0, zIndex: 60, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(23,35,61,0.42)", padding: 18 },
  flowDismiss: { position: "absolute", inset: 0 },
  flowMenu: { width: "100%", maxWidth: 620, maxHeight: "84vh" as never, backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#17233D", borderRadius: 22, padding: 22, boxShadow: "8px 8px 0 #17233D" as never },
  flowMenuCompact: { maxHeight: "90vh" as never, padding: 16 },
  flowMenuTitle: { fontSize: 29, fontWeight: "900", color: "#17233D" },
  flowMenuSubtitle: { fontSize: 14, color: "#687083", marginTop: 4 },
  flowMenuScroll: { marginTop: 14 },
  flowMenuList: { gap: 8, paddingBottom: 4 },
  flowMenuItem: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: "#D2CCBF", borderRadius: 12, backgroundColor: "#FFFFFF" },
  flowMenuItemActive: { borderWidth: 2, borderColor: "#2F6FC2", backgroundColor: "#DDEBFF" },
  flowMenuItemText: { flex: 1, fontSize: 16, fontWeight: "800", color: "#384157" },
  flowMenuItemTextActive: { color: "#173C72", fontWeight: "900" },
  flowMenuItemArrow: { fontSize: 13, fontWeight: "900", color: "#8A91A3" },
  setupWrap: { width: "100%", maxWidth: 1180, alignSelf: "center", alignItems: "center", paddingTop: 10, paddingBottom: 40 },
  eyebrowPill: { backgroundColor: "#E9E4D9", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9, marginBottom: 20 },
  eyebrowText: { fontSize: 15, fontWeight: "800", color: "#51596B", letterSpacing: 0.5 },
  heroTitle: { fontSize: 54, lineHeight: 66, fontWeight: "900", color: "#17233D", textAlign: "center", letterSpacing: -1.8 },
  heroAccent: { color: "#2F6FC2" },
  heroSubtitle: { fontSize: 22, lineHeight: 32, color: "#60687A", marginTop: 10, marginBottom: 30, textAlign: "center" },
  setupCard: { width: "100%", backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#17233D", borderRadius: 24, flexDirection: "row", overflow: "hidden", marginBottom: 26, boxShadow: "7px 7px 0 #17233d" as never },
  setupCardCompact: { flexDirection: "column" },
  formArea: { flex: 1, padding: 34, gap: 12 },
  setupVisual: { flex: 1, minHeight: 330, padding: 28, backgroundColor: "#F1EDDF", justifyContent: "center" },
  label: { fontSize: 17, fontWeight: "800", color: "#384157", marginTop: 4 },
  input: { minHeight: 58, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#C7C1B4", borderRadius: 12, paddingHorizontal: 16, fontSize: 21, color: "#17233D", outlineStyle: "none" as never },
  demographicGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  demographicOption: { minWidth: 98, flexGrow: 1, minHeight: 48, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#C7C1B4", borderRadius: 11 },
  demographicOptionEducation: { width: "31%" },
  demographicOptionSelected: { backgroundColor: "#17233D", borderColor: "#17233D" },
  demographicOptionText: { fontSize: 15, lineHeight: 21, fontWeight: "800", color: "#51596B", textAlign: "center" },
  demographicOptionTextSelected: { color: "#FFFFFF" },
  setupDivider: { height: 1, backgroundColor: "#D8D1C4", marginVertical: 10 },
  setupSectionTitle: { fontSize: 20, fontWeight: "900", color: "#17233D", marginTop: 2 },
  segmentRow: { flexDirection: "row", gap: 10 },
  segment: { flex: 1, minHeight: 56, justifyContent: "center", alignItems: "center", borderRadius: 12, borderWidth: 2, borderColor: "#C7C1B4", backgroundColor: "#FFFFFF" },
  segmentActive: { backgroundColor: "#17233D", borderColor: "#17233D" },
  segmentText: { fontSize: 18, fontWeight: "800", color: "#51596B" },
  segmentTextActive: { color: "#FFFFFF" },
  checkRow: { flexDirection: "row", alignItems: "center", minHeight: 48, gap: 12, marginTop: 4 },
  checkbox: { width: 27, height: 27, borderRadius: 7, borderWidth: 2, borderColor: "#9B9488", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#2F6FC2", borderColor: "#2F6FC2" },
  checkboxTick: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  checkText: { fontSize: 17, color: "#51596B", fontWeight: "600" },
  primaryButton: { minWidth: 220, minHeight: 72, paddingHorizontal: 34, justifyContent: "center", alignItems: "center", borderRadius: 16, backgroundColor: "#17233D", borderWidth: 2, borderColor: "#17233D", boxShadow: "4px 4px 0 #89aef0" as never },
  primaryButtonText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  secondaryButton: { backgroundColor: "#FFFDF8", borderColor: "#17233D", boxShadow: "4px 4px 0 #d8d1c4" as never },
  secondaryButtonText: { color: "#17233D" },
  disabledButton: { opacity: 0.35, boxShadow: "none" as never },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: "1px 1px 0 #17233D" as never },
  questionScreen: { width: "100%", maxWidth: 1040, alignSelf: "center", alignItems: "center", paddingTop: 26, paddingBottom: 50 },
  questionScreenDense: { paddingTop: 0 },
  smallEyebrow: { fontSize: 15, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: "900", color: "#2F6FC2", marginBottom: 12 },
  centerTitle: { fontSize: 44, lineHeight: 55, fontWeight: "900", color: "#17233D", textAlign: "center", letterSpacing: -0.8 },
  centerTitleDense: { fontSize: 38, lineHeight: 48 },
  centerSubtitle: { fontSize: 20, lineHeight: 30, color: "#687083", textAlign: "center", marginTop: 10, marginBottom: 30 },
  centerSubtitleDense: { fontSize: 18, lineHeight: 27, marginTop: 6, marginBottom: 18 },
  optionGrid: { width: "100%", flexDirection: "row", gap: 18, justifyContent: "center", marginBottom: 26 },
  optionGridCompact: { flexDirection: "column" },
  practiceCard: { flex: 1, minHeight: 270, maxWidth: 440, borderRadius: 22, borderWidth: 3, borderColor: "#17233D", padding: 26, justifyContent: "flex-end", boxShadow: "6px 6px 0 #17233d" as never },
  practiceStudRow: { position: "absolute", top: 34, left: 30, right: 30, flexDirection: "row", justifyContent: "space-around" },
  practiceStud: { width: 92, height: 46, backgroundColor: "rgba(255,255,255,0.38)", borderRadius: 999, borderWidth: 3, borderColor: "rgba(23,35,61,0.6)" },
  practiceLabel: { fontSize: 28, fontWeight: "900", color: "#17233D", backgroundColor: "rgba(255,255,255,0.86)", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, alignSelf: "flex-start" },
  cardPressed: { transform: [{ translateY: 3 }], opacity: 0.84 },
  promptCard: { width: "100%", backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#17233D", borderRadius: 22, padding: 28, marginBottom: 28, boxShadow: "6px 6px 0 #DAD3C6" as never },
  promptNumber: { color: "#2F6FC2", fontSize: 15, fontWeight: "900", letterSpacing: 1.5, marginBottom: 8 },
  promptText: { fontSize: 27, lineHeight: 38, fontWeight: "800", color: "#17233D" },
  promptLine: { height: 1, backgroundColor: "#D8D1C4", marginVertical: 24 },
  aiBackgroundGrid: { width: "100%", flexDirection: "row", alignItems: "stretch", gap: 16, marginBottom: 16 },
  aiQuestionCard: { flex: 1, backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#17233D", borderRadius: 20, padding: 20, gap: 16 },
  aiQuestionText: { minHeight: 68, fontSize: 24, lineHeight: 34, fontWeight: "900", color: "#17233D" },
  aiNoteCard: { width: "100%", backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#C8C1B5", borderRadius: 18, padding: 18, gap: 12, marginBottom: 16 },
  aiNotePrompt: { fontSize: 21, lineHeight: 30, fontWeight: "800", color: "#17233D" },
  neutralIntroCard: { width: "100%", backgroundColor: "#EEF5FF", borderLeftWidth: 5, borderLeftColor: "#2F6FC2", borderRadius: 16, padding: 18, gap: 8, marginBottom: 26 },
  neutralIntroLabel: { fontSize: 14, fontWeight: "900", color: "#2F6FC2" },
  neutralIntroText: { fontSize: 18, lineHeight: 28, fontWeight: "700", color: "#384157" },
  scenarioWrap: { width: "100%", maxWidth: 1240, alignSelf: "center" },
  scenarioHero: { flexDirection: "row", gap: 44, alignItems: "stretch" },
  scenarioHeroCompact: { flexDirection: "column", gap: 26 },
  scenarioVisualCol: { flex: 1, minWidth: 0, justifyContent: "center", alignItems: "center", position: "relative" },
  scenarioQuestionCol: { flex: 1, minWidth: 0, justifyContent: "center", alignItems: "flex-start", paddingVertical: 10 },
  contextStrip: { width: "100%", minHeight: 76, flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: "#FFFDF8", borderLeftWidth: 5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 18 },
  contextIcon: { width: 48, height: 48, borderRadius: 13, borderWidth: 2, borderColor: "#17233D", alignItems: "center", justifyContent: "center" },
  contextIconText: { fontSize: 24, fontWeight: "900", color: "#17233D" },
  contextCopy: { flex: 1 },
  contextLabel: { fontSize: 14, fontWeight: "900", color: "#2F6FC2", marginBottom: 3 },
  contextDescription: { fontSize: 16, lineHeight: 23, fontWeight: "700", color: "#384157" },
  scenarioNumber: { position: "absolute", top: -8, left: 2, zIndex: 2, width: 58, height: 58, borderRadius: 14, borderWidth: 2, borderColor: "#17233D", alignItems: "center", justifyContent: "center" },
  scenarioNumberText: { fontSize: 20, fontWeight: "900", color: "#17233D" },
  scenarioLabel: { fontSize: 23, fontWeight: "900", marginTop: 18, color: "#17233D" },
  questionTitle: { fontSize: 43, lineHeight: 54, fontWeight: "900", color: "#17233D", letterSpacing: -0.7 },
  questionHint: { fontSize: 18, lineHeight: 28, color: "#687083", marginTop: 10, marginBottom: 22 },
  choiceStack: { width: "100%", gap: 12 },
  choiceButton: { width: "100%", minHeight: 86, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#BEB7AA", borderRadius: 16 },
  choiceButtonCompact: { minHeight: 70 },
  choiceButtonSelected: { borderColor: "#2F6FC2", backgroundColor: "#EEF5FF" },
  choiceSymbol: { width: 52, height: 52, borderRadius: 13, backgroundColor: "#EDE8DE", alignItems: "center", justifyContent: "center" },
  choiceSymbolSelected: { backgroundColor: "#7BB7FF" },
  choiceSymbolText: { fontSize: 26, fontWeight: "900", color: "#17233D" },
  choiceCopy: { flex: 1 },
  choiceLabel: { fontSize: 22, fontWeight: "900", color: "#17233D" },
  choiceHint: { fontSize: 15, color: "#687083", marginTop: 3 },
  choiceArrow: { fontSize: 24, fontWeight: "900", color: "#2F6FC2" },
  openQuestionCard: { width: "100%", backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#17233D", borderRadius: 18, padding: 18, gap: 14, boxShadow: "4px 4px 0 #D8D1C4" as never },
  openQuestionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  speechMark: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#FFD54F", alignItems: "center", justifyContent: "center" },
  speechMarkText: { fontSize: 32, lineHeight: 38, fontWeight: "900", color: "#17233D" },
  openQuestionLabel: { fontSize: 16, fontWeight: "900", color: "#384157" },
  openQuestionInput: { width: "100%", minHeight: 112, backgroundColor: "#F7F4EC", borderWidth: 2, borderColor: "#C8C1B5", borderRadius: 14, paddingHorizontal: 16, paddingTop: 14, fontSize: 19, lineHeight: 28, color: "#17233D", textAlignVertical: "top", outlineStyle: "none" as never },
  finalQuestionList: { width: "100%", gap: 16, marginBottom: 28 },
  finalQuestionCard: { width: "100%", backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#C8C1B5", borderRadius: 18, padding: 20, gap: 12 },
  finalQuestionHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  finalQuestionNumber: { backgroundColor: "#17233D", color: "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, fontWeight: "900" },
  finalQuestionDimension: { backgroundColor: "#DDEBFF", color: "#173C72", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, fontWeight: "900" },
  finalQuestionAudience: { backgroundColor: "#FFF0A6", color: "#6C5700", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, fontWeight: "900" },
  finalQuestionText: { fontSize: 23, lineHeight: 34, fontWeight: "900", color: "#17233D" },
  probeBox: { backgroundColor: "#EEF5FF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 5 },
  probeLabel: { color: "#2F6FC2", fontSize: 13, fontWeight: "900", marginBottom: 2 },
  probeText: { color: "#51596B", fontSize: 15, lineHeight: 23, fontWeight: "600" },
  finalQuestionInput: { width: "100%", minHeight: 104, backgroundColor: "#F7F4EC", borderWidth: 2, borderColor: "#C8C1B5", borderRadius: 14, paddingHorizontal: 16, paddingTop: 14, fontSize: 18, lineHeight: 27, color: "#17233D", textAlignVertical: "top", outlineStyle: "none" as never },
  backButton: { marginTop: 16, paddingVertical: 10 },
  backButtonText: { fontSize: 16, color: "#60687A", fontWeight: "700" },
  scene: { width: "100%", maxWidth: 540, minHeight: 430, borderRadius: 28, borderWidth: 2, borderColor: "#17233D", overflow: "hidden", position: "relative" },
  sceneCaption: { position: "absolute", top: 20, left: 20, zIndex: 8, backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#17233D", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  sceneCaptionText: { fontSize: 16, fontWeight: "900", color: "#17233D" },
  sceneTable: { position: "absolute", left: 0, right: 0, bottom: 0, height: 110, backgroundColor: "#E2D5BE", borderTopWidth: 2, borderTopColor: "#17233D" },
  sceneBlock: { position: "absolute", height: 72, borderWidth: 2, borderColor: "#17233D", borderRadius: 6, boxShadow: "4px 5px 0 rgba(23,35,61,0.25)" as never },
  sceneBlockOne: { width: 128, left: "18%", bottom: 116, transform: [{ rotate: "-6deg" }] },
  sceneBlockTwo: { width: 72, right: "17%", bottom: 176, transform: [{ rotate: "10deg" }] },
  sceneBlockThree: { width: 128, right: "28%", bottom: 70 },
  stud: { position: "absolute", width: 38, height: 16, left: 16, top: -13, borderWidth: 2, borderColor: "#17233D", borderRadius: 5, backgroundColor: "rgba(255,255,255,0.4)" },
  childFigure: { position: "absolute", left: 28, top: 105, width: 106, height: 190, alignItems: "center", zIndex: 2 },
  childHead: { width: 82, height: 82, borderRadius: 41, backgroundColor: "#F5C6A5", borderWidth: 3, borderColor: "#17233D", zIndex: 2 },
  childEye: { position: "absolute", width: 8, height: 8, left: 20, top: 34, borderRadius: 4, backgroundColor: "#17233D" },
  childBody: { width: 106, height: 126, borderTopLeftRadius: 40, borderTopRightRadius: 40, borderWidth: 3, borderColor: "#17233D", marginTop: -4 },
  thoughtBubble: { position: "absolute", top: 60, right: 92, width: 118, height: 76, borderRadius: 24, backgroundColor: "#FFFDF8", borderWidth: 3, borderColor: "#17233D", zIndex: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  thoughtText: { fontSize: 34, fontWeight: "900", color: "#17233D" },
  miniBrick: { width: 42, height: 26, borderWidth: 2, borderColor: "#17233D", backgroundColor: "#FF8E7A", borderRadius: 4 },
  magnifyRing: { position: "absolute", width: 128, height: 128, borderRadius: 999, borderWidth: 12, borderColor: "#17233D", top: 145, left: "47%", backgroundColor: "rgba(255,255,255,0.44)", zIndex: 3 },
  magnifyHandle: { position: "absolute", width: 24, height: 96, backgroundColor: "#17233D", borderRadius: 14, top: 244, left: "69%", transform: [{ rotate: "-42deg" }], zIndex: 3 },
  focusBubble: { position: "absolute", top: 58, right: 62, width: 118, height: 72, borderRadius: 24, backgroundColor: "#FFFDF8", borderWidth: 3, borderColor: "#17233D", zIndex: 4, alignItems: "center", justifyContent: "center" },
  focusDots: { fontSize: 28, fontWeight: "900", color: "#17233D", letterSpacing: 4 },
  muteSlash: { position: "absolute", width: 98, height: 7, borderRadius: 4, backgroundColor: "#C84B39", transform: [{ rotate: "-30deg" }] },
  handShape: { position: "absolute", width: 120, height: 150, borderRadius: 50, top: 66, right: "18%", backgroundColor: "#F5C6A5", borderWidth: 2, borderColor: "#17233D", transform: [{ rotate: "20deg" }] },
  fingerOne: { position: "absolute", width: 36, height: 100, borderRadius: 20, top: -62, left: 12, backgroundColor: "#F5C6A5", borderWidth: 2, borderColor: "#17233D" },
  fingerTwo: { position: "absolute", width: 36, height: 90, borderRadius: 20, top: -54, left: 52, backgroundColor: "#F5C6A5", borderWidth: 2, borderColor: "#17233D" },
  sceneBadge: { position: "absolute", top: 55, right: 44, width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: "#17233D", justifyContent: "center", alignItems: "center", boxShadow: "5px 5px 0 #17233D" as never },
  sceneBadgeText: { fontSize: 54, fontWeight: "900", color: "#FFFFFF" },
  stepArrow: { position: "absolute", top: 60, left: 145, minWidth: 115, height: 58, borderRadius: 14, backgroundColor: "#FFFDF8", borderWidth: 3, borderColor: "#17233D", alignItems: "center", justifyContent: "center" },
  stepArrowText: { fontSize: 22, fontWeight: "900", color: "#17233D" },
  wrongBlock: { position: "absolute", width: 94, height: 60, right: 90, top: 190, borderRadius: 6, borderWidth: 3, borderColor: "#17233D", backgroundColor: "#FF8E7A", transform: [{ rotate: "24deg" }], zIndex: 4, alignItems: "center", justifyContent: "center" },
  wrongStud: { position: "absolute", top: -16, width: 36, height: 16, borderWidth: 3, borderColor: "#17233D", backgroundColor: "#FFB3A6", borderRadius: 5 },
  wrongMark: { fontSize: 34, fontWeight: "900", color: "#8F2E22" },
  roleGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 28 },
  roleCard: { width: "48%", minHeight: 188, flexDirection: "row", alignItems: "center", gap: 16, padding: 18, backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#C8C1B5", borderRadius: 20 },
  roleCardCompact: { minHeight: 170, padding: 14 },
  roleCardSelected: { borderColor: "#17233D", backgroundColor: "#FFFBEA", boxShadow: "4px 4px 0 #17233D" as never },
  roleSymbol: { width: 66, height: 66, borderRadius: 18, borderWidth: 2, borderColor: "#17233D", alignItems: "center", justifyContent: "center" },
  roleSymbolText: { fontSize: 32, fontWeight: "900", color: "#17233D" },
  roleCopy: { flex: 1 },
  roleTitle: { fontSize: 23, fontWeight: "900", color: "#17233D", marginBottom: 5 },
  roleSubtitle: { fontSize: 15, lineHeight: 22, color: "#687083" },
  roleCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#AAA397", alignItems: "center", justifyContent: "center" },
  roleCheckSelected: { backgroundColor: "#17233D", borderColor: "#17233D" },
  roleCheckText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  ruleList: { width: "100%", gap: 14, marginBottom: 28 },
  ruleCard: { minHeight: 98, flexDirection: "row", alignItems: "center", gap: 18, padding: 18, borderRadius: 18, borderWidth: 2, borderColor: "#C8C1B5", backgroundColor: "#FFFDF8" },
  ruleCardSelected: { borderColor: "#17233D", backgroundColor: "#FFF6C9", boxShadow: "5px 5px 0 #17233D" as never },
  ruleIndex: { width: 52, height: 52, borderRadius: 13, backgroundColor: "#E9E4D9", alignItems: "center", justifyContent: "center" },
  ruleIndexSelected: { backgroundColor: "#17233D" },
  ruleIndexText: { fontWeight: "900", fontSize: 16, color: "#51596B" },
  ruleIndexTextSelected: { color: "#FFFFFF", fontSize: 23 },
  ruleText: { flex: 1, fontSize: 22, lineHeight: 32, fontWeight: "800", color: "#17233D" },
  ruleStar: { fontSize: 24, color: "#C9C2B6" },
  ruleStarSelected: { color: "#E6A800" },
  controlSection: { width: "100%", borderWidth: 1, borderRadius: 22, padding: 16, gap: 14, marginBottom: 14 },
  controlSectionButton: { backgroundColor: "#FFF8D8", borderColor: "#E3CB66" },
  controlSectionVoice: { backgroundColor: "#EDF5FF", borderColor: "#ABC7EE" },
  controlSectionMain: { width: "100%", flexDirection: "row", alignItems: "stretch", gap: 16 },
  controlSectionMainCompact: { flexDirection: "column", gap: 14 },
  controlSectionHeader: { width: 172, minHeight: 102, justifyContent: "center", alignItems: "flex-start", paddingHorizontal: 8 },
  controlSectionHeaderCompact: { width: "100%", minHeight: 0, paddingHorizontal: 2 },
  controlSectionTitle: { fontSize: 25, lineHeight: 34, fontWeight: "900", color: "#17233D" },
  controlSectionHint: { fontSize: 15, lineHeight: 22, fontWeight: "700", color: "#626A7A", marginTop: 4 },
  controlSectionMulti: { fontSize: 12, lineHeight: 18, fontWeight: "900", color: "#2F6FC2", marginTop: 8 },
  controlGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 9, alignItems: "stretch" },
  controlCard: { position: "relative", flexGrow: 1, width: 112, minHeight: 104, backgroundColor: "rgba(255,255,255,0.78)", borderWidth: 1, borderColor: "rgba(23,35,61,0.20)", borderRadius: 15, alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8, paddingVertical: 10 },
  controlCardCompact: { width: "47%", minHeight: 104 },
  controlCardSelectedButton: { borderWidth: 2, borderColor: "#17233D", backgroundColor: "#FFD95E" },
  controlCardSelectedVoice: { borderWidth: 2, borderColor: "#17233D", backgroundColor: "#86B8F5" },
  controlCardPressed: { transform: [{ scale: 0.98 }], opacity: 0.88 },
  controlIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  controlIconWrapButton: { backgroundColor: "#FFF0A8" },
  controlIconWrapVoice: { backgroundColor: "#D8E9FF" },
  controlIconWrapSelected: { backgroundColor: "rgba(255,255,255,0.62)" },
  controlSelectionDot: { position: "absolute", top: 10, right: 10, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: "#9BA2B0", backgroundColor: "transparent" },
  controlSelectionDotSelected: { borderWidth: 4, borderColor: "#17233D", backgroundColor: "#FFFFFF" },
  controlLabel: { fontSize: 18, lineHeight: 25, fontWeight: "900", color: "#17233D", textAlign: "center" },
  controlLabelSelected: { color: "#17233D" },
  customControlEditor: { width: "100%", backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 15, padding: 14, gap: 8 },
  customControlEditorWide: { marginLeft: 188, width: "auto" as never },
  customControlPrompt: { fontSize: 16, lineHeight: 24, fontWeight: "800", color: "#384157" },
  customControlInput: { width: "100%", minHeight: 58, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#7BA8E9", borderRadius: 13, paddingHorizontal: 16, fontSize: 21, fontWeight: "700", color: "#17233D", outlineStyle: "none" as never },
  childChoiceStrip: { width: "100%", backgroundColor: "#FFFDF5", borderWidth: 1, borderColor: "#E2D59B", borderRadius: 16, padding: 15, gap: 10, marginBottom: 14 },
  childChoiceStripWide: { flexDirection: "row", alignItems: "center", gap: 16 },
  childControlSummary: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  childControlSummaryLabel: { minWidth: 54, backgroundColor: "#F2DA73", color: "#17233D", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontWeight: "900", textAlign: "center" },
  childControlSummaryText: { flex: 1, color: "#17233D", fontSize: 18, lineHeight: 27, fontWeight: "800" },
  roleChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  roleChip: { backgroundColor: "#17233D", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  roleChipText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  parentRoleGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 18 },
  parentExpectationCard: { width: "100%", backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#C8C1B5", borderRadius: 20, padding: 22, gap: 12, marginBottom: 16 },
  parentExpectationQuestion: { fontSize: 25, lineHeight: 36, fontWeight: "900", color: "#17233D" },
  parentExpectationHint: { fontSize: 15, lineHeight: 23, color: "#687083", marginBottom: 4 },
  recordingChoiceGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 12 },
  recordingChoice: { width: "48%" },
  recordingChoiceCompact: { width: "100%" },
  parentRuleCard: { minHeight: 108, flexDirection: "row", alignItems: "center", gap: 16, padding: 18, backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#17233D", borderRadius: 18 },
  parentRuleTag: { backgroundColor: "#FFF0A6", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  parentRuleTagText: { fontSize: 13, fontWeight: "900", color: "#6C5700" },
  arrow: { fontSize: 26, color: "#2F6FC2", fontWeight: "900" },
  originalStrip: { width: "100%", backgroundColor: "#FFF6C9", borderRadius: 16, borderWidth: 2, borderColor: "#E3C64B", padding: 18, marginBottom: 22 },
  originalLabel: { fontSize: 13, fontWeight: "900", color: "#766100", marginBottom: 7 },
  originalLabelInline: { marginBottom: 0, marginRight: 4 },
  originalText: { fontSize: 20, lineHeight: 29, color: "#17233D", fontWeight: "800" },
  negotiationBoard: { width: "100%", backgroundColor: "#ECE7DC", borderRadius: 24, padding: 14, marginBottom: 22 },
  compareRow: { width: "100%", flexDirection: "row", alignItems: "stretch", gap: 12 },
  compareRowCompact: { flexDirection: "column" },
  childCard: { flex: 1, minHeight: 170, backgroundColor: "#FFF6C9", borderWidth: 2, borderColor: "#D5B830", borderRadius: 18, padding: 22 },
  parentCard: { flex: 1, minHeight: 170, backgroundColor: "#E7F1FF", borderWidth: 2, borderColor: "#7BA8E9", borderRadius: 18, padding: 22 },
  compareTag: { alignSelf: "flex-start", backgroundColor: "#FFD54F", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, fontWeight: "900", color: "#594700", marginBottom: 16 },
  parentTag: { backgroundColor: "#7BB7FF", color: "#173C72" },
  compareChoiceGroup: { gap: 5, marginBottom: 16 },
  compareChoiceLabel: { fontSize: 14, lineHeight: 21, fontWeight: "900", color: "#2F6FC2" },
  compareText: { fontSize: 21, lineHeight: 32, fontWeight: "800", color: "#17233D" },
  compareJoin: { minWidth: 58, justifyContent: "center", alignItems: "center" },
  compareJoinText: { fontSize: 28, fontWeight: "900", color: "#2F6FC2" },
  compareJoinLabel: { fontSize: 12, fontWeight: "900", color: "#687083", marginTop: 3 },
  negotiationGrid: { width: "100%", flexDirection: "row", gap: 12, alignItems: "stretch" },
  negotiationOption: { width: "32%" },
  negotiationOptionCompact: { width: "100%" },
  completeWrap: { width: "100%", maxWidth: 920, alignSelf: "center", alignItems: "center", paddingTop: 26, paddingBottom: 50 },
  completeBadge: { backgroundColor: "#77D6C8", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8, borderWidth: 2, borderColor: "#17233D", marginBottom: 16 },
  completeBadgeText: { fontSize: 16, fontWeight: "900", color: "#17233D" },
  completeTitle: { fontSize: 43, lineHeight: 54, fontWeight: "900", color: "#17233D", textAlign: "center" },
  completeSubtitle: { fontSize: 20, lineHeight: 29, color: "#687083", textAlign: "center", marginTop: 10, marginBottom: 28 },
  participantNumberCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#E9E4D9", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, marginTop: -10, marginBottom: 18 },
  participantNumberLabel: { fontSize: 14, fontWeight: "800", color: "#687083" },
  participantNumberValue: { fontSize: 18, fontWeight: "900", color: "#17233D", letterSpacing: 0.6 },
  finalRules: { width: "100%", gap: 12, marginBottom: 28 },
  finalRoleBlock: { minHeight: 100, backgroundColor: "#FFF6C9", borderWidth: 2, borderColor: "#D8BC3A", borderRadius: 18, padding: 18, gap: 12 },
  finalRoleChip: { backgroundColor: "#17233D", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  finalRoleChipText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  finalRule: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: 18, padding: 18, backgroundColor: "#FFFDF8", borderWidth: 2, borderColor: "#17233D", borderRadius: 18 },
  finalRuleNumber: { fontSize: 16, fontWeight: "900", color: "#2F6FC2" },
  finalRuleText: { flex: 1, fontSize: 21, lineHeight: 31, fontWeight: "800", color: "#17233D" },
  finalControl: { minHeight: 86, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, padding: 18, backgroundColor: "#17233D", borderRadius: 18 },
  finalControlLabel: { color: "#AAB8D2", fontSize: 15, fontWeight: "800" },
  finalControlValue: { flex: 1, color: "#FFFFFF", fontSize: 22, lineHeight: 31, fontWeight: "900", textAlign: "right" },
  exportRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14 },
  modalOverlay: { position: "fixed" as never, inset: 0, zIndex: 50, flexDirection: "row", justifyContent: "flex-end", backgroundColor: "rgba(23,35,61,0.35)" },
  modalDismiss: { flex: 1 },
  researcherPanel: { width: 430, height: "100%", backgroundColor: "#FFFDF8", borderLeftWidth: 2, borderLeftColor: "#17233D", padding: 26, overflowY: "auto" as never },
  researcherPanelCompact: { width: "92%" },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  panelTitle: { fontSize: 28, fontWeight: "900", color: "#17233D" },
  closeButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#E9E4D9", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 30, lineHeight: 34, color: "#17233D" },
  panelMeta: { fontSize: 14, color: "#687083", marginBottom: 22 },
  panelLabel: { fontSize: 15, fontWeight: "900", color: "#384157", marginBottom: 8, marginTop: 12 },
  textarea: { minHeight: 96, paddingTop: 14, textAlignVertical: "top" },
  panelStats: { flexDirection: "row", gap: 14, marginVertical: 20 },
  statNumber: { fontSize: 27, fontWeight: "900", color: "#17233D" },
  statLabel: { fontSize: 13, color: "#687083", marginTop: 2 },
  panelAction: { minHeight: 54, backgroundColor: "#17233D", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  panelActionText: { fontSize: 16, color: "#FFFFFF", fontWeight: "900" },
  panelDanger: { minHeight: 50, borderWidth: 1, borderColor: "#D87B6B", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  panelDangerText: { fontSize: 15, color: "#A83B2D", fontWeight: "800" },
  privacyNote: { fontSize: 12, lineHeight: 19, color: "#777F8F", marginTop: 18 },
});
