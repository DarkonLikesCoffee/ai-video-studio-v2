import compositionRegistry from "../schemas/composition-registry.json" with { type: "json" };

export type RendererKind = "project-video" | "custom-remotion";
export type RenderMode = "2d" | "3d" | "hybrid";
export type CompositionAvailability = "registered" | "to-be-built";

export type CompositionCapability = {
  id: string;
  renderer: RendererKind;
  renderMode: RenderMode;
  selectable: boolean;
  purpose: string;
  strengths: string[];
  limitations: string[];
};

// The shared JSON catalogue is consumed by both the Director and render
// preflight. Add every new production composition there and register its
// component in RemotionRoot before it can be selected. CI and render preflight
// require the two ID sets to match exactly.
export const COMPOSITION_REGISTRY = compositionRegistry as readonly CompositionCapability[];

export const getCompositionCapability = (id: string): CompositionCapability | undefined =>
  COMPOSITION_REGISTRY.find((composition) => composition.id === id);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const validateRenderStrategy = (value: unknown): string[] => {
  if (!isRecord(value)) return ["renderStrategy is required and must be an object."];

  const errors: string[] = [];
  const { renderer, compositionId, availability, rationale, requiredCapabilities, fallback } = value;

  if (renderer !== "project-video" && renderer !== "custom-remotion") {
    errors.push('renderStrategy.renderer must be "project-video" or "custom-remotion".');
  }
  if (typeof compositionId !== "string" || !/^[A-Z][A-Za-z0-9]{1,63}$/.test(compositionId)) {
    errors.push("renderStrategy.compositionId must be a PascalCase Remotion composition ID.");
  }
  if (availability !== "registered" && availability !== "to-be-built") {
    errors.push('renderStrategy.availability must be "registered" or "to-be-built".');
  }
  if (!nonEmpty(rationale) || rationale.length > 500) {
    errors.push("renderStrategy.rationale must be a non-empty string of at most 500 characters.");
  }
  if (!Array.isArray(requiredCapabilities) || requiredCapabilities.length === 0 ||
      requiredCapabilities.length > 12 || requiredCapabilities.some((item) => !nonEmpty(item) || item.length > 160)) {
    errors.push("renderStrategy.requiredCapabilities must contain 1–12 non-empty strings of at most 160 characters.");
  }
  if (!nonEmpty(fallback) || fallback.length > 500) {
    errors.push("renderStrategy.fallback must be a non-empty string of at most 500 characters.");
  }

  if (typeof compositionId === "string" && availability === "registered") {
    const selected = getCompositionCapability(compositionId);
    if (!selected) {
      errors.push(`renderStrategy.compositionId "${compositionId}" is not registered in the current composition catalogue.`);
    } else if (!["2d", "3d", "hybrid"].includes(selected.renderMode)) {
      errors.push(`renderStrategy.compositionId "${compositionId}" must declare renderMode as 2d, 3d, or hybrid.`);
    } else if (!selected.selectable) {
      errors.push(`renderStrategy.compositionId "${compositionId}" is registered for reference/testing only, not production selection.`);
    } else if (renderer !== selected.renderer) {
      errors.push(`renderStrategy.renderer must be "${selected.renderer}" for composition "${compositionId}".`);
    }
  }

  if (availability === "to-be-built") {
    if (renderer !== "custom-remotion") errors.push('A "to-be-built" composition must use renderer "custom-remotion".');
    if (typeof compositionId === "string" && getCompositionCapability(compositionId)) {
      errors.push(`renderStrategy.compositionId "${compositionId}" already exists; select its registered availability instead.`);
    }
  }

  if (renderer === "project-video" &&
      (compositionId !== "ProjectVideo" || availability !== "registered")) {
    errors.push('The "project-video" renderer must select registered composition "ProjectVideo".');
  }
  if (renderer === "custom-remotion" && compositionId === "ProjectVideo") {
    errors.push('Use renderer "project-video" for composition "ProjectVideo".');
  }

  return errors;
};

export const renderCompositionRegistryForPrompt = (): string =>
  COMPOSITION_REGISTRY.map((composition) => {
    const status = composition.selectable ? "selectable" : "reference/test only — do not select";
    return [
      `- ${composition.id} [${composition.renderer}; ${composition.renderMode}; ${status}]`,
      `  Purpose: ${composition.purpose}`,
      `  Strengths: ${composition.strengths.join("; ")}`,
      `  Limitations: ${composition.limitations.join("; ")}`,
    ].join("\n");
  }).join("\n");
