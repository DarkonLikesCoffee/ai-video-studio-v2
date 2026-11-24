import { access, appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import compositionRegistry from "../schemas/composition-registry.json" with { type: "json" };
import { validateRenderRequest } from "./render-request.mjs";

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const extractRegisteredCompositionIds = (rootSource) =>
  [...rootSource.matchAll(/<Composition\s+id="([^"]+)"/g)].map((match) => match[1]);

export const resolveProductionPlanPath = (request) => {
  if (typeof request.productionPlanPath === "string") return request.productionPlanPath;
  if (typeof request.projectPath !== "string") return undefined;
  return path.posix.join(path.posix.dirname(request.projectPath), "production", "production-plan.json");
};

export const validateRenderStrategyAgainstRequest = ({
  request,
  plan,
  registeredCompositionIds,
  catalogue = compositionRegistry,
}) => {
  const errors = [];
  const requestedId = request.compositionId;
  const registeredSet = new Set(registeredCompositionIds);
  const catalogueIds = catalogue.map((entry) => entry.id);
  const catalogueSet = new Set(catalogueIds);

  if (registeredSet.size !== registeredCompositionIds.length) {
    errors.push("RemotionRoot contains duplicate composition IDs.");
  }
  if (catalogueSet.size !== catalogueIds.length) {
    errors.push("The production composition catalogue contains duplicate IDs.");
  }
  if (registeredSet.size !== catalogueSet.size ||
      [...registeredSet].some((id) => !catalogueSet.has(id)) ||
      [...catalogueSet].some((id) => !registeredSet.has(id))) {
    errors.push("RemotionRoot and the production composition catalogue must contain exactly the same composition IDs.");
  }

  if (!registeredSet.has(requestedId)) {
    errors.push(`compositionId "${requestedId}" is not registered in packages/video-engine/src/root.tsx.`);
  }

  const selected = catalogue.find((entry) => entry.id === requestedId);
  if (!selected) {
    errors.push(`compositionId "${requestedId}" is not present in the production composition catalogue.`);
  } else {
    if (!selected.selectable) {
      errors.push(`compositionId "${requestedId}" is registered for reference/testing only and cannot be used for production rendering.`);
    }
    if (!["2d", "3d", "hybrid"].includes(selected.renderMode)) {
      errors.push(`compositionId "${requestedId}" must declare renderMode as 2d, 3d, or hybrid in the production catalogue.`);
    }
  }

  if (plan === undefined || plan === null) return errors;
  if (!isRecord(plan.renderStrategy)) {
    errors.push("The linked production plan is missing its required renderStrategy.");
    return errors;
  }

  const strategy = plan.renderStrategy;
  if (strategy.renderer !== "project-video" && strategy.renderer !== "custom-remotion") {
    errors.push("The linked production plan has an unsupported renderer.");
  }
  if (typeof strategy.compositionId !== "string" || !/^[A-Z][A-Za-z0-9]{1,63}$/.test(strategy.compositionId)) {
    errors.push("The linked production plan must specify a valid PascalCase compositionId.");
  }
  if (strategy.availability !== "registered") {
    errors.push("The linked production plan selects a composition marked to-be-built; implement and register it before rendering.");
  }
  if (typeof strategy.rationale !== "string" || !strategy.rationale.trim() || strategy.rationale.length > 500) {
    errors.push("The linked production plan must include a non-empty renderStrategy.rationale (maximum 500 characters).");
  }
  if (!Array.isArray(strategy.requiredCapabilities) || strategy.requiredCapabilities.length === 0 ||
      strategy.requiredCapabilities.length > 12 ||
      strategy.requiredCapabilities.some((item) => typeof item !== "string" || !item.trim() || item.length > 160)) {
    errors.push("The linked production plan must list 1–12 non-empty required capabilities (maximum 160 characters each).");
  }
  if (typeof strategy.fallback !== "string" || !strategy.fallback.trim() || strategy.fallback.length > 500) {
    errors.push("The linked production plan must specify a non-empty fallback (maximum 500 characters).");
  }

  if (typeof strategy.compositionId === "string" && !registeredCompositionIds.includes(strategy.compositionId)) {
    errors.push(`production-plan compositionId "${strategy.compositionId}" is not registered in RemotionRoot.`);
  }
  const planned = catalogue.find((entry) => entry.id === strategy.compositionId);
  if (!planned) {
    errors.push(`production-plan compositionId "${String(strategy.compositionId)}" is not present in the production composition catalogue.`);
  } else {
    if (!planned.selectable) {
      errors.push(`production-plan compositionId "${planned.id}" is registered for reference/testing only and cannot be selected for production.`);
    }
    if (strategy.renderer !== planned.renderer) {
      errors.push(`Production-plan renderer must be "${planned.renderer}" for composition "${planned.id}".`);
    }
  }
  if (strategy.compositionId !== requestedId) {
    errors.push(`Render request compositionId "${requestedId}" does not match production-plan compositionId "${String(strategy.compositionId)}".`);
  }
  const expectedRenderer = requestedId === "ProjectVideo" ? "project-video" : "custom-remotion";
  if (strategy.renderer !== expectedRenderer) {
    errors.push(`Production-plan renderer must be "${expectedRenderer}" for composition "${requestedId}".`);
  }
  return errors;
};

const run = async () => {
  const requestPath = process.argv[2] ?? "render-request.json";
  const rootPath = process.argv[3] ?? "packages/video-engine/src/root.tsx";
  const rawRequest = JSON.parse(await readFile(requestPath, "utf8"));
  const requestValidation = validateRenderRequest(rawRequest);
  if (requestValidation.errors.length || !requestValidation.request) {
    throw new Error(requestValidation.errors.join("\n"));
  }
  const request = requestValidation.request;
  const rootSource = await readFile(rootPath, "utf8");
  const registeredCompositionIds = extractRegisteredCompositionIds(rootSource);
  const planPath = resolveProductionPlanPath(request);
  let plan;

  if (planPath) {
    try {
      await access(planPath);
      plan = JSON.parse(await readFile(planPath, "utf8"));
    } catch (error) {
      if (request.productionPlanPath) {
        throw new Error(`Explicit productionPlanPath could not be read: ${planPath} (${error instanceof Error ? error.message : String(error)})`);
      }
      console.log(`No adjacent production plan found at ${planPath}; catalogue and Remotion registration are still checked. Legacy render remains supported.`);
    }
  }

  const errors = validateRenderStrategyAgainstRequest({ request, plan, registeredCompositionIds });
  if (errors.length) throw new Error(errors.join("\n"));
  const selected = compositionRegistry.find((entry) => entry.id === request.compositionId);
  if (!selected || !["2d", "3d", "hybrid"].includes(selected.renderMode)) {
    throw new Error(`Composition ${request.compositionId} has no supported renderMode.`);
  }
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `render_mode=${selected.renderMode}\n`);
  }
  if (process.env.CIRCLECI === "true" && process.env.BASH_ENV) {
    await appendFile(process.env.BASH_ENV, `export RENDER_MODE="${selected.renderMode}"\n`);
  }
  if (plan) {
    console.log(`Accepted Director strategy: ${plan.renderStrategy.renderer} / ${plan.renderStrategy.compositionId} (${selected.renderMode}, registered and selectable).`);
  } else {
    console.log(`Accepted registered, selectable ${selected.renderMode} composition ${request.compositionId}; no linked production plan was supplied.`);
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
