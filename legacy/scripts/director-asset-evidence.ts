import { readFile, writeFile } from "node:fs/promises";
import { stat, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as ts from "typescript";
import { validateProductionPlan } from "./validate-production-plan";

type RecordValue = Record<string, unknown>;
type Issue = { code: string; severity: "warning" | "error"; message: string; shotId?: string; criterion?: string; assetRef?: string };
type LocalStatus = "present" | "missing" | "empty" | "unsafe" | "not-local";
type PreviewStatus = LocalStatus | "not-required";
type VisualReviewStatus = "approved" | "pending" | "rejected" | "missing" | "not-required";
type ReusePolicy = "required" | "optional" | "reference-only";
type AssetUsageStatus = "referenced" | "not-referenced" | "not-required" | "unverifiable";
type ShotUsageStatus = "verified" | "missing" | "unverifiable" | "not-audited" | "not-required";
type AssetEvidence = {
  id: string;
  reference: string;
  aliases: string[];
  type: string | null;
  shotIds: string[];
  path: string | null;
  localStatus: LocalStatus;
  provenanceStatus: "documented" | "missing";
  rightsStatus: "documented" | "missing";
  provenance: string | null;
  rights: string | null;
  previewPath: string | null;
  previewStatus: PreviewStatus;
  visualReviewApplicable: boolean;
  visualReviewStatus: VisualReviewStatus;
  reusePolicy: ReusePolicy;
  usageStatus: AssetUsageStatus;
  usageEvidence: string[];
  shotUsageStatus: ShotUsageStatus;
  shotUsageEvidence: string[];
  visualReview: { reviewer: string | null; reviewedAt: string | null; notes: string | null };
};
type ShotEvidence = {
  shotId: string;
  plannedAssetRefs: string[];
  matchedPlannedAssetRefs: string[];
  unresolvedPlannedAssetRefs: string[];
  manifestAssets: AssetEvidence[];
};
type CriterionEvidence = {
  criterion: string;
  shotIds: string[];
  linkedShotCount: number;
  unlinkedShotIds: string[];
  assetStatus: "linked" | "partial" | "unlinked" | "invalid";
  readiness: "ready" | "needs-review" | "no-assets";
  assets: AssetEvidence[];
};
export type AssetEvidenceReport = {
  schemaVersion: 1;
  reportType: "production-asset-evidence";
  generatedAt: string;
  generatedBy: "ai-video-studio/director:asset-evidence";
  project: { id: string; title: string };
  source: { planPath: string | null; manifestPath: string | null; projectRoot: string };
  summary: {
    status: "ready" | "needs-review" | "invalid" | "no-assets" | "criteria-unavailable";
    shotCount: number;
    assetCount: number;
    shotsWithAssets: number;
    unlinkedShots: number;
    criterionCount: number;
    linkedCriteria: number;
    partialCriteria: number;
    unlinkedCriteria: number;
    missingFiles: number;
    assetsNotLocal: number;
    emptyFiles: number;
    unsafePaths: number;
    missingProvenance: number;
    missingRights: number;
    unresolvedPlannedAssetRefs: number;
    unknownManifestShotIds: number;
    visualReviewNotRequired: number;
    visualReviewApproved: number;
    visualReviewPending: number;
    visualReviewRejected: number;
    visualReviewMissing: number;
    missingPreviews: number;
    requiredAssetCount: number;
    requiredAssetsReferenced: number;
    requiredAssetsNotReferenced: number;
    requiredAssetsUnverifiable: number;
    requiredAssetsVerifiedInAssignedShots: number;
    requiredAssetsMissingFromAssignedShots: number;
    requiredAssetsShotUsageUnverifiable: number;
    requiredAssetsShotUsageNotAudited: number;
  };
  shots: ShotEvidence[];
  assets: AssetEvidence[];
  criteria: CriterionEvidence[];
  issues: Issue[];
};

const isRecord = (value: unknown): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value);
const asText = (value: unknown): string | null => typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
const normalizeRef = (value: string) => value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^assets\//i, "").toLowerCase();
const basename = (value: string) => value.replace(/\\/g, "/").split("/").filter(Boolean).pop()?.toLowerCase() ?? "";
const isWithin = (root: string, target: string) => {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

const resolveLocalPath = async (asset: RecordValue, projectRoot: string): Promise<{ path: string | null; status: LocalStatus }> => {
  const rawPath = asText(asset.path);
  const rawFile = asText(asset.file);
  const raw = rawPath ?? rawFile;
  if (!raw) return { path: null, status: "not-local" };
  const normalized = raw.replace(/\\/g, "/");
  if (path.isAbsolute(raw) || /^[a-zA-Z]:/.test(normalized) || normalized.split("/").includes("..")) {
    return { path: null, status: "unsafe" };
  }
  const relativePath = rawPath
    ? normalized.replace(/^\.\//, "")
    : normalized.startsWith("assets/") ? normalized : "assets/" + normalized;
  const absolute = path.resolve(projectRoot, relativePath);
  if (!isWithin(projectRoot, absolute)) return { path: null, status: "unsafe" };
  try {
    const [rootReal, assetReal, details] = await Promise.all([realpath(projectRoot), realpath(absolute), stat(absolute)]);
    if (!isWithin(rootReal, assetReal)) return { path: null, status: "unsafe" };
    if (!details.isFile()) return { path: relativePath, status: "missing" };
    return { path: relativePath, status: details.size > 0 ? "present" : "empty" };
  } catch {
    return { path: relativePath, status: "missing" };
  }
};

const getAliases = (asset: RecordValue): string[] => [...new Set([asset.id, asset.assetId, asset.file, asset.path]
  .map(asText).filter((value): value is string => value !== null))];
const getReference = (asset: RecordValue, index: number): string => asText(asset.path) ?? asText(asset.file) ?? asText(asset.id) ?? `asset-${index + 1}`;
const hasProvenance = (asset: RecordValue) => Boolean(asText(asset.provenance) || asText(asset.sourcePage) || asText(asset.sourceUrl) || asText(asset.creator) || asText(asset.attribution));
const hasRights = (asset: RecordValue) => Boolean(asText(asset.license) || (asText(asset.rightsBasis) && asText(asset.rightsNote)));
const isAudioAsset = (asset: RecordValue): boolean => {
  const declaredType = (asText(asset.type) ?? "").toLowerCase();
  const assetPath = `${asText(asset.path) ?? ""} ${asText(asset.file) ?? ""}`;
  return declaredType.startsWith("audio/") ||
    /\b(?:audio|sound|music|narration|voice(?:over)?|ambience)\b/.test(declaredType) ||
    /\.(?:aac|aif|aiff|alac|flac|m4a|mid|midi|mp3|oga|ogg|opus|wav|wma)$/i.test(assetPath);
};

const reusePolicies = ["required", "optional", "reference-only"] as const;
const getReusePolicy = (asset: RecordValue): ReusePolicy => {
  const declared = asText(asset.reusePolicy);
  if (declared && reusePolicies.includes(declared as ReusePolicy)) return declared as ReusePolicy;
  return asText(asset.usageRole) === "design-reference" ? "reference-only" : "optional";
};

type SourceReference = { value: string; sourceFile: string };
type ProjectVideoSceneReferences = { sceneId: string; references: SourceReference[] };
type CompositionReferences = {
  available: boolean;
  source: string | null;
  references: SourceReference[];
  referencesByModule: Map<string, SourceReference[]>;
  reachableModules: Set<string>;
  projectVideoScenes: ProjectVideoSceneReferences[] | null;
  reason?: string;
};

const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".json"];
const isAuditableSource = (filePath: string): boolean => sourceExtensions.includes(path.extname(filePath).toLowerCase());

const collectJsonAssetReferences = (value: unknown, sourceFile: string, references: SourceReference[]): void => {
  if (Array.isArray(value)) {
    for (const entry of value) collectJsonAssetReferences(entry, sourceFile, references);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if ((key === "src" || key === "poster") && typeof entry === "string") {
      references.push({ value: entry, sourceFile });
    } else {
      collectJsonAssetReferences(entry, sourceFile, references);
    }
  }
};

const collectProjectVideoAssetReferences = (
  value: unknown,
  sourceFile: string,
): { references: SourceReference[]; projectVideoScenes: ProjectVideoSceneReferences[] } => {
  if (!isRecord(value)) return { references: [], projectVideoScenes: [] };
  const references: SourceReference[] = [];
  const projectVideoScenes: ProjectVideoSceneReferences[] = [];
  const addSource = (entry: unknown, target?: SourceReference[]) => {
    if (isRecord(entry) && typeof entry.src === "string") {
      const reference = { value: entry.src, sourceFile };
      references.push(reference);
      target?.push(reference);
    }
  };
  if (Array.isArray(value.scenes)) {
    for (const scene of value.scenes) {
      if (!isRecord(scene)) continue;
      const sceneReferences: SourceReference[] = [];
      const mediaItems = Array.isArray(scene.mediaLayers)
        ? scene.mediaLayers
        : scene.media ? [scene.media] : [];
      for (const media of mediaItems) addSource(media, sceneReferences);
      const sceneId = asText(scene.id);
      if (sceneId) projectVideoScenes.push({ sceneId, references: sceneReferences });
    }
  }
  // Audio tracks are global in ProjectVideo and therefore do not map to individual shots.
  if (Array.isArray(value.audioTracks)) {
    for (const track of value.audioTracks) addSource(track);
  }
  return { references, projectVideoScenes };
};

const resolveLocalModule = async (specifier: string, containingFile: string, repositoryRoot: string): Promise<string | null> => {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(containingFile), specifier);
  const extension = path.extname(base).toLowerCase();
  const candidates = extension
    ? [base]
    : [
        base,
        ...sourceExtensions.map((suffix) => base + suffix),
        ...sourceExtensions.map((suffix) => path.join(base, "index" + suffix)),
      ];
  for (const candidate of candidates) {
    if (!isWithin(repositoryRoot, candidate)) continue;
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Try the next supported source extension.
    }
  }
  return null;
};

const findCompositionModule = (rootSource: string, compositionId: string): string | null => {
  const sourceFile = ts.createSourceFile("root.tsx", rootSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let componentName: string | null = null;
  const visit = (node: ts.Node): void => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sourceFile) === "Composition") {
      const idAttribute = node.attributes.properties.find((attribute): attribute is ts.JsxAttribute =>
        ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === "id");
      const idValue = idAttribute && idAttribute.initializer && ts.isStringLiteral(idAttribute.initializer)
        ? idAttribute.initializer.text
        : null;
      const componentAttribute = node.attributes.properties.find((attribute): attribute is ts.JsxAttribute =>
        ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === "component");
      const componentExpression = componentAttribute?.initializer && ts.isJsxExpression(componentAttribute.initializer)
        ? componentAttribute.initializer.expression
        : null;
      if (idValue === compositionId && componentExpression && ts.isIdentifier(componentExpression)) {
        componentName = componentExpression.text;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!componentName) return null;

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.importClause) continue;
    const clause = statement.importClause;
    if (clause.name?.text === componentName) return statement.moduleSpecifier.text;
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamedImports(bindings) && bindings.elements.some((element) => element.name.text === componentName)) {
      return statement.moduleSpecifier.text;
    }
  }
  return null;
};

const mediaAssetExtensions = new Set([
  ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp",
  ".mp4", ".m4v", ".mov", ".webm", ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac",
  ".glb", ".gltf", ".obj", ".fbx", ".stl", ".usdz", ".hdr", ".exr", ".ktx", ".bin",
  ".woff", ".woff2", ".ttf", ".otf",
]);

const isMediaAssetPath = (value: string): boolean =>
  mediaAssetExtensions.has(path.extname(value.split(/[?#]/, 1)[0] ?? "").toLowerCase());

const resolveStaticString = (expression: ts.Expression | undefined, constants: Map<string, string>): string | null => {
  if (!expression) return null;
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (ts.isIdentifier(expression)) return constants.get(expression.text) ?? null;
  if (ts.isParenthesizedExpression(expression)) return resolveStaticString(expression.expression, constants);
  if (ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression) || ts.isNonNullExpression(expression)) {
    return resolveStaticString(expression.expression, constants);
  }
  return null;
};

const collectImportedSourceReferences = async (
  entryFile: string,
  repositoryRoot: string,
  projectRoot: string,
): Promise<{ references: SourceReference[]; referencesByModule: Map<string, SourceReference[]>; reachableModules: Set<string> }> => {
  const references: SourceReference[] = [];
  const referencesByModule = new Map<string, SourceReference[]>();
  const reachableModules = new Set<string>();
  const visited = new Set<string>();
  const visitFile = async (filePath: string): Promise<void> => {
    const absolute = path.resolve(filePath);
    if (!isWithin(repositoryRoot, absolute) || visited.has(absolute) || !isAuditableSource(absolute)) return;
    visited.add(absolute);
    let contents: string;
    try {
      contents = await readFile(absolute, "utf8");
    } catch {
      return;
    }
    const relativeSource = path.relative(repositoryRoot, absolute).split(path.sep).join("/");
    reachableModules.add(relativeSource);
    const moduleReferences: SourceReference[] = [];
    if (path.extname(absolute).toLowerCase() === ".json") {
      try {
        collectJsonAssetReferences(JSON.parse(contents) as unknown, relativeSource, moduleReferences);
      } catch {
        // Invalid JSON cannot prove asset use.
      }
      references.push(...moduleReferences);
      referencesByModule.set(relativeSource, moduleReferences);
      return;
    }
    const ext = path.extname(absolute).toLowerCase();
    const kind = ext === ".tsx" ? ts.ScriptKind.TSX
      : ext === ".jsx" ? ts.ScriptKind.JSX
      : ext === ".js" || ext === ".mjs" || ext === ".cjs" ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(absolute, contents, ts.ScriptTarget.Latest, true, kind);
    const imports: string[] = [];
    const staticFileAliases = new Set<string>();
    const staticFileNamespaces = new Set<string>();
    const constants = new Map<string, string>();
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== "remotion") continue;
      const bindings = statement.importClause?.namedBindings;
      if (!bindings) continue;
      if (ts.isNamespaceImport(bindings)) staticFileNamespaces.add(bindings.name.text);
      if (ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if ((element.propertyName?.text ?? element.name.text) === "staticFile") staticFileAliases.add(element.name.text);
        }
      }
    }
    const gatherConstants = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const value = resolveStaticString(node.initializer, constants);
        if (value !== null) constants.set(node.name.text, value);
      }
      ts.forEachChild(node, gatherConstants);
    };
    gatherConstants(sourceFile);
    const recordStaticFileCall = (node: ts.CallExpression): void => {
      const expression = node.expression;
      const isNamedStaticFile = ts.isIdentifier(expression) && staticFileAliases.has(expression.text);
      const isNamespaceStaticFile = ts.isPropertyAccessExpression(expression) &&
        expression.name.text === "staticFile" && ts.isIdentifier(expression.expression) &&
        staticFileNamespaces.has(expression.expression.text);
      if (!isNamedStaticFile && !isNamespaceStaticFile) return;
      const value = resolveStaticString(node.arguments[0], constants);
      if (value !== null) moduleReferences.push({ value, sourceFile: relativeSource });
    };
    const addModuleRelativeAsset = (specifier: string): void => {
      const cleanSpecifier = specifier.split(/[?#]/, 1)[0] ?? specifier;
      const value = cleanSpecifier.startsWith(".") || path.isAbsolute(cleanSpecifier)
        ? path.relative(projectRoot, path.resolve(path.dirname(absolute), cleanSpecifier)).split(path.sep).join("/")
        : cleanSpecifier;
      moduleReferences.push({ value, sourceFile: relativeSource });
    };
    const visitNode = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        if (isMediaAssetPath(specifier)) addModuleRelativeAsset(specifier);
        else imports.push(specifier);
      }
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node)) {
        recordStaticFileCall(node);
        const firstArgument = node.arguments[0];
        if (firstArgument && ts.isStringLiteral(firstArgument)) {
          const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
          const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
          if (isRequire || isDynamicImport) {
            const specifier = firstArgument.text;
            if (isMediaAssetPath(specifier)) addModuleRelativeAsset(specifier);
            else imports.push(specifier);
          }
        }
      }
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "URL") {
        const specifier = resolveStaticString(node.arguments?.[0], constants);
        if (specifier && isMediaAssetPath(specifier)) addModuleRelativeAsset(specifier);
      }
      if (ts.isJsxAttribute(node) && (node.name.getText(sourceFile) === "src" || node.name.getText(sourceFile) === "poster")) {
        const initializer = node.initializer;
        const value = initializer && ts.isStringLiteral(initializer)
          ? initializer.text
          : initializer && ts.isJsxExpression(initializer)
            ? resolveStaticString(initializer.expression, constants)
            : null;
        if (value !== null) moduleReferences.push({ value, sourceFile: relativeSource });
      }
      ts.forEachChild(node, visitNode);
    };
    visitNode(sourceFile);
    references.push(...moduleReferences);
    referencesByModule.set(relativeSource, moduleReferences);
    for (const specifier of imports) {
      const resolved = await resolveLocalModule(specifier, absolute, repositoryRoot);
      if (resolved) await visitFile(resolved);
    }
  };
  await visitFile(entryFile);
  return { references, referencesByModule, reachableModules };
};
const collectCompositionReferences = async (
  plan: RecordValue,
  projectRoot: string,
  repositoryRoot: string,
): Promise<CompositionReferences> => {
  const strategy = isRecord(plan.renderStrategy) ? plan.renderStrategy : {};
  const renderer = asText(strategy.renderer);
  const compositionId = asText(strategy.compositionId);
  if (!renderer || !compositionId) return { available: false, source: null, references: [], referencesByModule: new Map(), reachableModules: new Set(), projectVideoScenes: null, reason: "The production plan has no valid render strategy." };

  if (renderer === "project-video" && compositionId === "ProjectVideo") {
    const scenePath = path.join(projectRoot, "scene.json");
    try {
      const scene = JSON.parse(await readFile(scenePath, "utf8")) as unknown;
      const collected = collectProjectVideoAssetReferences(scene, "scene.json");
      return { available: true, source: "scene.json", referencesByModule: new Map(), reachableModules: new Set(), ...collected };
    } catch {
      return { available: false, source: "scene.json", references: [], referencesByModule: new Map(), reachableModules: new Set(), projectVideoScenes: null, reason: "The selected ProjectVideo scene.json could not be read." };
    }
  }

  const rootPath = path.join(repositoryRoot, "packages", "video-engine", "src", "root.tsx");
  let rootSource: string;
  try {
    rootSource = await readFile(rootPath, "utf8");
  } catch {
    return { available: false, source: path.relative(repositoryRoot, rootPath), references: [], referencesByModule: new Map(), reachableModules: new Set(), projectVideoScenes: null, reason: "The Remotion composition registry source could not be read." };
  }
  const moduleSpecifier = findCompositionModule(rootSource, compositionId);
  if (!moduleSpecifier) {
    return { available: false, source: path.relative(repositoryRoot, rootPath), references: [], referencesByModule: new Map(), reachableModules: new Set(), projectVideoScenes: null, reason: "The selected composition could not be mapped to its imported component in RemotionRoot." };
  }
  const componentFile = await resolveLocalModule(moduleSpecifier, rootPath, repositoryRoot);
  if (!componentFile) {
    return { available: false, source: moduleSpecifier, references: [], referencesByModule: new Map(), reachableModules: new Set(), projectVideoScenes: null, reason: "The selected composition component source could not be resolved." };
  }
  const collected = await collectImportedSourceReferences(componentFile, repositoryRoot, projectRoot);
  return { available: true, source: path.relative(repositoryRoot, componentFile), ...collected, projectVideoScenes: null };
};

const normalizeUsagePath = (value: string): string =>
  (value.split(/[?#]/, 1)[0] ?? value).replace(/\\/g, "/").replace(/^\.\//, "");

const usageMatchesAsset = (reference: SourceReference, localPath: string | null): boolean => {
  // Compare the canonical project-relative path; preserve folders and case.
  if (!localPath) return false;
  return normalizeUsagePath(reference.value) === normalizeUsagePath(localPath);
};
type ShotComponentMapping = { schemaVersion: 1; shots: Array<{ shotId: string; modules: string[] }> };
const readShotComponentMapping = (manifest: RecordValue): { mapping: ShotComponentMapping | null; error: string | null } => {
  const raw = manifest.shotComponents;
  if (raw === undefined) return { mapping: null, error: null };
  if (!isRecord(raw) || raw.schemaVersion !== 1 || !Array.isArray(raw.shots)) {
    return { mapping: null, error: "shotComponents must contain schemaVersion 1 and a shots array." };
  }
  const seen = new Set<string>();
  const shots: ShotComponentMapping["shots"] = [];
  for (const [index, entry] of raw.shots.entries()) {
    if (!isRecord(entry) || typeof entry.shotId !== "string" || !entry.shotId.trim() ||
        !Array.isArray(entry.modules) || entry.modules.length === 0 ||
        entry.modules.some((module) => typeof module !== "string" || !module.trim())) {
      return { mapping: null, error: `shotComponents.shots[${index}] must contain a shotId and one or more module paths.` };
    }
    const shotId = entry.shotId.trim();
    if (seen.has(shotId)) return { mapping: null, error: `shotComponents contains duplicate shotId "${shotId}".` };
    seen.add(shotId);
    const modules = (entry.modules as string[]).map((module) => {
      const normalized = module.trim().replace(/\\/g, "/").replace(/^\.\//, "");
      return path.posix.normalize(normalized);
    });
    if (modules.some((module) => module === "." || module.startsWith("/") || module.split("/").includes("..") || module.startsWith("../"))) {
      return { mapping: null, error: `shotComponents for "${shotId}" contains an unsafe module path.` };
    }
    if (new Set(modules).size !== modules.length) {
      return { mapping: null, error: `shotComponents for "${shotId}" contains duplicate module paths.` };
    }
    shots.push({ shotId, modules });
  }
  return { mapping: { schemaVersion: 1, shots }, error: null };
};

const describeProvenance = (asset: RecordValue) => asText(asset.provenance) ?? asText(asset.sourcePage) ?? asText(asset.sourceUrl) ?? asText(asset.creator) ?? asText(asset.attribution);
const describeRights = (asset: RecordValue) => asText(asset.license) ?? (asText(asset.rightsBasis) && asText(asset.rightsNote) ? `${asset.rightsBasis}: ${asset.rightsNote}` : null);

const assetMatchesRef = (asset: AssetEvidence, reference: string): boolean => {
  const target = normalizeRef(reference);
  return asset.aliases.some((alias) => normalizeRef(alias) === target || basename(alias) === basename(reference));
};

export const buildAssetEvidenceReport = async (
  planValue: unknown,
  manifestValue: unknown,
  options: { projectRoot: string; repositoryRoot?: string; planPath?: string; manifestPath?: string; generatedAt?: string },
): Promise<AssetEvidenceReport> => {
  if (!isRecord(planValue) || !Array.isArray(planValue.shots)) throw new Error("Production plan must contain a shots array.");
  const planErrors = validateProductionPlan(planValue);
  if (planErrors.length) throw new Error("Production plan invalid:\\n" + planErrors.map((error) => "- " + error).join("\\n"));
  if (!isRecord(manifestValue) || !Array.isArray(manifestValue.assets)) throw new Error("Asset manifest must contain an assets array.");
  const projectRoot = path.resolve(options.projectRoot);
  const requireVisualReview = planValue.assetVisualReviewRequired === true;
  const repositoryRoot = path.resolve(options.repositoryRoot ?? process.cwd());
  const compositionReferences = await collectCompositionReferences(planValue, projectRoot, repositoryRoot);
  const shotsInput = planValue.shots.filter(isRecord);
  const shotIds = shotsInput.map((shot) => asText(shot.id)).filter((id): id is string => id !== null);
  const knownShots = new Set(shotIds);
  const issues: Issue[] = [];
  const addIssue = (issue: Issue) => issues.push(issue);
  const assets: AssetEvidence[] = [];
  const unknownShotIds = new Set<string>();
  const customRemotion = isRecord(planValue.renderStrategy) && planValue.renderStrategy.renderer === "custom-remotion";
  const shotComponentContract = readShotComponentMapping(manifestValue);
  const componentModulesByShot = new Map<string, string[]>();
  if (shotComponentContract.error) {
    addIssue({ code: "CUSTOM_SHOT_COMPONENT_MAPPING_INVALID", severity: "error", message: shotComponentContract.error });
  }
  if (customRemotion && shotComponentContract.mapping && !shotComponentContract.error) {
    for (const mapping of shotComponentContract.mapping.shots) {
      if (!knownShots.has(mapping.shotId)) {
        addIssue({ code: "CUSTOM_SHOT_COMPONENT_UNKNOWN_SHOT", severity: "error", shotId: mapping.shotId, message: `shotComponents maps unknown production-plan shot "${mapping.shotId}".` });
      } else {
        componentModulesByShot.set(mapping.shotId, mapping.modules);
      }
    }
    for (const shotId of shotIds) {
      if (!componentModulesByShot.has(shotId)) {
        addIssue({ code: "CUSTOM_SHOT_COMPONENT_MAPPING_MISSING", severity: "error", shotId, message: `Custom Remotion shot "${shotId}" has no shotComponents module mapping.` });
      }
    }
  }
  if (manifestValue.assets.length === 0) addIssue({ code: "ASSET_MANIFEST_EMPTY", severity: "warning", message: "Asset manifest contains no assets." });

  for (const [index, value] of manifestValue.assets.entries()) {
    if (!isRecord(value)) {
      addIssue({ code: "INVALID_ASSET_ENTRY", severity: "error", message: `assets[${index}] must be an object.` });
      continue;
    }
    const reference = getReference(value, index);
    const aliases = getAliases(value);
    if (!asText(value.type)) addIssue({ code: "ASSET_TYPE_MISSING", severity: "warning", message: `Asset "${reference}" has no type.`, assetRef: reference });
    const local = await resolveLocalPath(value, projectRoot);
    const visualReviewApplicable = !isAudioAsset(value);
    const declaredReusePolicy = asText(value.reusePolicy);
    const validReusePolicy = declaredReusePolicy === null || reusePolicies.includes(declaredReusePolicy as ReusePolicy);
    if (!validReusePolicy) addIssue({ code: "ASSET_REUSE_POLICY_INVALID", severity: "error", message: `Asset "${reference}" reusePolicy must be required, optional or reference-only.`, assetRef: reference });
    const assetShotIds = Array.isArray(value.shotIds) ? value.shotIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim()) : [];
    const reusePolicy = getReusePolicy(value);
    const usageMatches = reusePolicy === "reference-only" ? [] : compositionReferences.references.filter((sourceReference) => usageMatchesAsset(sourceReference, local.path));
    const usageStatus: AssetUsageStatus = reusePolicy === "reference-only"
      ? "not-required"
      : !compositionReferences.available
        ? "unverifiable"
        : usageMatches.length > 0 ? "referenced" : "not-referenced";
    const usageEvidence = [...new Set(usageMatches.map((match) => `${match.sourceFile}: ${match.value}`))];
    let shotUsageStatus: ShotUsageStatus = reusePolicy !== "required" || !visualReviewApplicable
      ? "not-required"
      : compositionReferences.projectVideoScenes !== null
        ? "unverifiable"
        : !customRemotion
          ? "not-audited"
          : shotComponentContract.error
            ? "unverifiable"
            : shotComponentContract.mapping
              ? "unverifiable"
              : "not-audited";
    const shotUsageEvidence: string[] = [];
    if (reusePolicy === "required" && visualReviewApplicable &&
        (compositionReferences.projectVideoScenes !== null || (customRemotion && shotComponentContract.mapping && !shotComponentContract.error))) {
      const assignedShotIds = assetShotIds.includes("all")
        ? shotIds
        : assetShotIds.filter((shotId) => shotId !== "all" && knownShots.has(shotId));
      let hasMissingShotUsage = false;
      let hasUnverifiableShotUsage = false;
      if (customRemotion && (shotComponentContract.error || !shotComponentContract.mapping)) {
        hasUnverifiableShotUsage = true;
        addIssue({
          code: "CUSTOM_SHOT_COMPONENT_MAPPING_UNVERIFIABLE",
          severity: "error",
          message: shotComponentContract.error ?? `Required custom Remotion asset "${reference}" cannot be checked per shot because the manifest has no shotComponents mapping.`,
          assetRef: reference,
        });
      }
      if (!assignedShotIds.length) {
        hasUnverifiableShotUsage = true;
        addIssue({
          code: "ASSET_SHOT_USAGE_UNVERIFIABLE",
          severity: "error",
          message: `Required asset "${reference}" has no valid shot assignment, so its per-shot use cannot be verified.`,
          assetRef: reference,
        });
      }
      for (const shotId of assignedShotIds) {
        let candidateReferences: SourceReference[] = [];
        let scope = "ProjectVideo scene";
        if (compositionReferences.projectVideoScenes !== null) {
          const sceneEvidence = compositionReferences.projectVideoScenes.find((scene) => scene.sceneId === shotId);
          if (!sceneEvidence) {
            hasUnverifiableShotUsage = true;
            addIssue({
              code: "ASSET_SHOT_USAGE_UNVERIFIABLE",
              severity: "error",
              message: `Required asset "${reference}" is assigned to shot "${shotId}", but no ProjectVideo scene with that ID exists.`,
              shotId,
              assetRef: reference,
            });
            continue;
          }
          candidateReferences = sceneEvidence.references;
        } else {
          scope = "custom Remotion mapped module";
          const modules = componentModulesByShot.get(shotId) ?? [];
          const normalizedModules = modules.map((module) => path.posix.normalize(module));
          const unreachable = normalizedModules.filter((module) => !compositionReferences.reachableModules.has(module));
          if (!modules.length || unreachable.length) {
            hasUnverifiableShotUsage = true;
            addIssue({
              code: "CUSTOM_SHOT_COMPONENT_MODULE_UNREACHABLE",
              severity: "error",
              message: unreachable.length
                ? `Mapped module(s) for custom Remotion shot "${shotId}" are not reachable from the selected composition: ${unreachable.join(", ")}.`
                : `Custom Remotion shot "${shotId}" has no mapped reachable module.`,
              shotId,
              assetRef: reference,
            });
            continue;
          }
          candidateReferences = normalizedModules.flatMap((module) => compositionReferences.referencesByModule.get(module) ?? []);
        }
        const match = candidateReferences.find((sourceReference) => usageMatchesAsset(sourceReference, local.path));
        if (!match) {
          hasMissingShotUsage = true;
          addIssue({
            code: compositionReferences.projectVideoScenes !== null
              ? "ASSET_REQUIRED_NOT_REFERENCED_IN_ASSIGNED_SHOT"
              : "CUSTOM_ASSET_REQUIRED_NOT_REFERENCED_IN_ASSIGNED_SHOT",
            severity: "error",
            message: `Required asset "${reference}" is not referenced by the ${scope} mapped to assigned shot "${shotId}".`,
            shotId,
            assetRef: reference,
          });
        } else {
          shotUsageEvidence.push(`${shotId}: ${match.sourceFile}: ${match.value}`);
        }
      }
      shotUsageStatus = hasMissingShotUsage
        ? "missing"
        : hasUnverifiableShotUsage
          ? "unverifiable"
          : "verified";
    }
    const previewRaw = asText(value.previewPath) ?? asText(value.preview);
    const previewLocal: { path: string | null; status: PreviewStatus } = !visualReviewApplicable
      ? { path: null, status: "not-required" }
      : previewRaw
        ? await resolveLocalPath({ path: previewRaw }, projectRoot)
        : { path: null, status: "not-local" };
    const reviewRaw = isRecord(value.visualReview) ? value.visualReview : {};
    const reviewStatus = ["approved", "pending", "rejected"].includes(String(reviewRaw.status))
      ? reviewRaw.status as "approved" | "pending" | "rejected"
      : "missing";
    const reviewer = asText(reviewRaw.reviewer);
    const reviewedAt = asText(reviewRaw.reviewedAt);
    const reviewNotes = asText(reviewRaw.notes);
    const reviewMetadataValid = Boolean(reviewer && reviewedAt && Number.isFinite(Date.parse(reviewedAt)) && reviewNotes);
    const visualReviewStatus: VisualReviewStatus = !visualReviewApplicable
      ? "not-required"
      : reviewStatus === "approved" && reviewMetadataValid && previewLocal.status === "present"
        ? "approved"
        : reviewStatus === "rejected" ? "rejected"
        : reviewStatus === "pending" ? "pending"
        : "missing";
    const provenanceStatus = hasProvenance(value) ? "documented" : "missing";
    const rightsStatus = hasRights(value) ? "documented" : "missing";
    if (!assetShotIds.length) addIssue({ code: "ASSET_SHOT_IDS_MISSING", severity: "warning", message: `Asset "${reference}" has no valid shotIds.`, assetRef: reference });
    for (const shotId of assetShotIds) {
      if (shotId !== "all" && !knownShots.has(shotId)) {
        unknownShotIds.add(shotId);
        addIssue({ code: "UNKNOWN_MANIFEST_SHOT_ID", severity: "warning", message: `Asset "${reference}" references unknown shot "${shotId}".`, shotId, assetRef: reference });
      }
    }
    if (local.status === "not-local") addIssue({ code: "ASSET_LOCAL_PATH_MISSING", severity: "warning", message: `Asset "${reference}" has no local file or path.`, assetRef: reference });
    else if (local.status === "unsafe") addIssue({ code: "ASSET_PATH_UNSAFE", severity: "error", message: `Asset "${reference}" resolves outside the project root or uses an absolute path.`, assetRef: reference });
    else if (local.status === "missing") addIssue({ code: "ASSET_FILE_MISSING", severity: "warning", message: `Asset "${reference}" does not exist at ${local.path ?? "its declared path"}.`, assetRef: reference });
    else if (local.status === "empty") addIssue({ code: "ASSET_FILE_EMPTY", severity: "warning", message: `Asset "${reference}" exists but is empty.`, assetRef: reference });
    if (provenanceStatus === "missing") addIssue({ code: "ASSET_PROVENANCE_MISSING", severity: "warning", message: `Asset "${reference}" has no source/provenance note or URL.`, assetRef: reference });
    if (rightsStatus === "missing") addIssue({ code: "ASSET_RIGHTS_MISSING", severity: "warning", message: `Asset "${reference}" has no license or explicit rights basis and note.`, assetRef: reference });
    if (reusePolicy === "required" && usageStatus === "not-referenced") addIssue({ code: "ASSET_REQUIRED_NOT_REFERENCED", severity: "error", message: `Required asset "${reference}" is not referenced by the selected composition source.`, assetRef: reference });
    if (reusePolicy === "required" && usageStatus === "unverifiable") addIssue({ code: "ASSET_USAGE_UNVERIFIABLE", severity: "error", message: `Required asset "${reference}" could not be audited: ${compositionReferences.reason ?? "composition source unavailable"}`, assetRef: reference });
    if (requireVisualReview && visualReviewApplicable) {
      if (previewLocal.status === "not-local") addIssue({ code: "ASSET_PREVIEW_MISSING", severity: "warning", message: `Asset "${reference}" has no declared preview file.`, assetRef: reference });
      else if (previewLocal.status !== "present") addIssue({ code: "ASSET_PREVIEW_UNAVAILABLE", severity: "warning", message: `Asset "${reference}" preview is ${previewLocal.status}.`, assetRef: reference });
      if (visualReviewStatus === "missing") addIssue({ code: "ASSET_VISUAL_REVIEW_MISSING", severity: "warning", message: `Asset "${reference}" has no complete visual-review approval.`, assetRef: reference });
      else if (visualReviewStatus === "pending") addIssue({ code: "ASSET_VISUAL_REVIEW_PENDING", severity: "warning", message: `Asset "${reference}" visual review is pending.`, assetRef: reference });
      else if (visualReviewStatus === "rejected") addIssue({ code: "ASSET_VISUAL_REVIEW_REJECTED", severity: "warning", message: `Asset "${reference}" was rejected during visual review.`, assetRef: reference });
    }
    assets.push({
      id: asText(value.id) ?? reference,
      reference,
      aliases,
      type: asText(value.type),
      shotIds: assetShotIds,
      path: local.path,
      localStatus: local.status,
      provenanceStatus,
      rightsStatus,
      provenance: describeProvenance(value),
      rights: describeRights(value),
      previewPath: previewLocal.path,
      previewStatus: previewLocal.status,
      visualReviewApplicable,
      visualReviewStatus,
      visualReview: { reviewer, reviewedAt, notes: reviewNotes },
      reusePolicy,
      usageStatus,
      usageEvidence,
      shotUsageStatus,
      shotUsageEvidence,
    });
  }

  const assetsByShot = new Map<string, AssetEvidence[]>();
  for (const shotId of shotIds) assetsByShot.set(shotId, []);
  for (const asset of assets) {
    for (const shotId of asset.shotIds) {
      if (shotId === "all") {
        for (const knownShotId of shotIds) assetsByShot.get(knownShotId)?.push(asset);
      } else assetsByShot.get(shotId)?.push(asset);
    }
  }

  const shots: ShotEvidence[] = shotsInput.map((shot) => {
    const shotId = asText(shot.id) ?? "unknown-shot";
    const plannedAssetRefs = Array.isArray(shot.assets) ? shot.assets.filter((value): value is string => typeof value === "string" && value.trim().length > 0) : [];
    const shotManifestAssets = assetsByShot.get(shotId) ?? [];
    const matchedPlannedAssetRefs = plannedAssetRefs.filter((reference) => shotManifestAssets.some((asset) => assetMatchesRef(asset, reference)));
    const unresolvedPlannedAssetRefs = plannedAssetRefs.filter((reference) => !matchedPlannedAssetRefs.includes(reference));
    for (const reference of unresolvedPlannedAssetRefs) {
      addIssue({ code: "PLAN_ASSET_UNRESOLVED", severity: "warning", message: `Shot "${shotId}" planned asset "${reference}" is not found in the manifest.`, shotId, assetRef: reference });
    }
    return { shotId, plannedAssetRefs, matchedPlannedAssetRefs, unresolvedPlannedAssetRefs, manifestAssets: shotManifestAssets };
  });

  const criteria: CriterionEvidence[] = [];
  const coverageInput = planValue.acceptanceCoverage;
  if (Array.isArray(coverageInput)) {
    for (const [index, value] of coverageInput.entries()) {
      if (!isRecord(value) || !asText(value.criterion) || !Array.isArray(value.shotIds)) {
        addIssue({ code: "INVALID_ACCEPTANCE_COVERAGE", severity: "error", message: `acceptanceCoverage[${index}] is malformed.` });
        continue;
      }
      const criterion = asText(value.criterion)!;
      const criterionShotIds = value.shotIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim());
      if (!criterionShotIds.length) addIssue({ code: "CRITERION_SHOTS_MISSING", severity: "error", message: `Criterion "${criterion}" must reference at least one shot.`, criterion });
      const unknown = criterionShotIds.filter((id) => !knownShots.has(id));
      unknown.forEach((shotId) => addIssue({ code: "CRITERION_UNKNOWN_SHOT", severity: "error", message: `Criterion "${criterion}" references unknown shot "${shotId}".`, shotId, criterion }));
      const linkedShotIds = criterionShotIds.filter((id) => (assetsByShot.get(id)?.length ?? 0) > 0);
      const unlinkedShotIds = criterionShotIds.filter((id) => !linkedShotIds.includes(id));
      const assetStatus: CriterionEvidence["assetStatus"] = unknown.length || !criterionShotIds.length ? "invalid" : linkedShotIds.length === criterionShotIds.length ? "linked" : linkedShotIds.length ? "partial" : "unlinked";
      const linkedAssets = [...new Set(criterionShotIds.flatMap((id) => assetsByShot.get(id) ?? []))];
      const readiness: CriterionEvidence["readiness"] = linkedAssets.length === 0 ? "no-assets" : linkedAssets.every((asset) => asset.localStatus === "present" && asset.provenanceStatus === "documented" && asset.rightsStatus === "documented") ? "ready" : "needs-review";
      if (assetStatus === "unlinked") addIssue({ code: "CRITERION_ASSET_UNLINKED", severity: "warning", message: `Criterion "${criterion}" maps to shots with no manifest assets; this may be intentional for procedural visuals.`, criterion });
      criteria.push({ criterion, shotIds: criterionShotIds, linkedShotCount: linkedShotIds.length, unlinkedShotIds, assetStatus, readiness, assets: linkedAssets });
    }
  }

  const missingFiles = assets.filter((asset) => asset.localStatus === "missing").length;
  const visualReviewNotRequired = assets.filter((asset) => asset.visualReviewStatus === "not-required").length;
  const visualReviewApproved = assets.filter((asset) => asset.visualReviewStatus === "approved").length;
  const visualReviewPending = assets.filter((asset) => asset.visualReviewStatus === "pending").length;
  const visualReviewRejected = assets.filter((asset) => asset.visualReviewStatus === "rejected").length;
  const visualReviewMissing = assets.filter((asset) => asset.visualReviewStatus === "missing").length;
  const missingPreviews = assets.filter((asset) => asset.previewStatus !== "present" && asset.previewStatus !== "not-required").length;
  const requiredAssetCount = assets.filter((asset) => asset.reusePolicy === "required").length;
  const requiredAssetsReferenced = assets.filter((asset) => asset.reusePolicy === "required" && asset.usageStatus === "referenced").length;
  const requiredAssetsNotReferenced = assets.filter((asset) => asset.reusePolicy === "required" && asset.usageStatus === "not-referenced").length;
  const requiredAssetsUnverifiable = assets.filter((asset) => asset.reusePolicy === "required" && asset.usageStatus === "unverifiable").length;
  const requiredAssetsVerifiedInAssignedShots = assets.filter((asset) => asset.reusePolicy === "required" && asset.shotUsageStatus === "verified").length;
  const requiredAssetsMissingFromAssignedShots = assets.filter((asset) => asset.reusePolicy === "required" && asset.shotUsageStatus === "missing").length;
  const requiredAssetsShotUsageUnverifiable = assets.filter((asset) => asset.reusePolicy === "required" && asset.shotUsageStatus === "unverifiable").length;
  const requiredAssetsShotUsageNotAudited = assets.filter((asset) => asset.reusePolicy === "required" && asset.shotUsageStatus === "not-audited").length;
  const assetsNotLocal = assets.filter((asset) => asset.localStatus === "not-local").length;
  const emptyFiles = assets.filter((asset) => asset.localStatus === "empty").length;
  const unsafePaths = assets.filter((asset) => asset.localStatus === "unsafe").length;
  const missingProvenance = assets.filter((asset) => asset.provenanceStatus === "missing").length;
  const missingRights = assets.filter((asset) => asset.rightsStatus === "missing").length;
  const unresolvedPlannedAssetRefs = shots.reduce((sum, shot) => sum + shot.unresolvedPlannedAssetRefs.length, 0);
  const linkedCriteria = criteria.filter((criterion) => criterion.assetStatus === "linked").length;
  const partialCriteria = criteria.filter((criterion) => criterion.assetStatus === "partial").length;
  const unlinkedCriteria = criteria.filter((criterion) => criterion.assetStatus === "unlinked").length;
  const shotsWithAssets = shots.filter((shot) => shot.manifestAssets.length > 0).length;
  const hasWarnings = issues.some((issue) => issue.severity === "warning");
  const hasErrors = issues.some((issue) => issue.severity === "error");
  const criteriaUnavailable = !Array.isArray(coverageInput) || coverageInput.length === 0;
  const status: AssetEvidenceReport["summary"]["status"] = hasErrors ? "invalid" : !assets.length ? "no-assets" : hasWarnings ? "needs-review" : criteriaUnavailable ? "criteria-unavailable" : "ready";
  return {
    schemaVersion: 1,
    reportType: "production-asset-evidence",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    generatedBy: "ai-video-studio/director:asset-evidence",
    project: { id: asText(planValue.id) ?? "unknown", title: asText(planValue.title) ?? "Untitled" },
    source: { planPath: options.planPath ?? null, manifestPath: options.manifestPath ?? null, projectRoot },
    summary: {
      status,
      shotCount: shots.length,
      assetCount: assets.length,
      shotsWithAssets,
      unlinkedShots: shots.length - shotsWithAssets,
      criterionCount: criteria.length,
      linkedCriteria,
      partialCriteria,
      unlinkedCriteria,
      missingFiles,
      assetsNotLocal,
      emptyFiles,
      unsafePaths,
      missingProvenance,
      missingRights,
      unresolvedPlannedAssetRefs,
      unknownManifestShotIds: unknownShotIds.size,
      visualReviewNotRequired,
      visualReviewApproved,
      visualReviewPending,
      visualReviewRejected,
      visualReviewMissing,
      missingPreviews,
      requiredAssetCount,
      requiredAssetsReferenced,
      requiredAssetsNotReferenced,
      requiredAssetsUnverifiable,
      requiredAssetsVerifiedInAssignedShots,
      requiredAssetsMissingFromAssignedShots,
      requiredAssetsShotUsageUnverifiable,
      requiredAssetsShotUsageNotAudited,
    },
    shots,
    assets,
    criteria,
    issues,
  };
};

const main = async () => {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const positional = args.filter((arg) => arg !== "--strict");
  const planPath = positional[0];
  const manifestPathArg = positional[1];
  const outputPath = positional[2];
  if (!planPath || positional.length > 3) {
    process.stderr.write("Usage: npm run director:asset-evidence -- <production-plan.json> [asset-manifest.json] [report.json] [--strict]\n");
    process.exitCode = 2;
    return;
  }
  try {
    const absolutePlanPath = path.resolve(planPath);
    const plan = JSON.parse(await readFile(absolutePlanPath, "utf8")) as unknown;
    const validationErrors = validateProductionPlan(plan);
    if (validationErrors.length) throw new Error("Production plan invalid:\n" + validationErrors.map((error) => "- " + error).join("\n"));
    const configuredManifestPath = isRecord(plan) ? asText(plan.assetManifestPath) : null;
    const manifestPath = path.resolve(manifestPathArg ?? configuredManifestPath ?? path.join(path.dirname(absolutePlanPath), "asset-manifest.json"));
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
    const manifestDirectory = path.dirname(manifestPath);
    const projectRoot = path.basename(manifestDirectory).toLowerCase() === "production" ? path.dirname(manifestDirectory) : manifestDirectory;
    const report = await buildAssetEvidenceReport(plan, manifest, {
      projectRoot,
      planPath: path.relative(process.cwd(), absolutePlanPath),
      manifestPath: path.relative(process.cwd(), manifestPath),
    });
    const output = JSON.stringify(report, null, 2) + "\n";
    if (outputPath) {
      await writeFile(path.resolve(outputPath), output, "utf8");
      process.stdout.write(`Asset evidence report written: ${outputPath}\n`);
    } else process.stdout.write(output);
    if (strict && (report.issues.some((issue) => issue.severity === "warning" || issue.severity === "error") || report.summary.status === "criteria-unavailable" || report.summary.status === "no-assets")) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`Could not create asset evidence report: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
