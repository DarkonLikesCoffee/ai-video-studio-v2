import { appendFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
const isRequestId = (value) => typeof value === "string" && /^[A-Za-z0-9._-]{1,80}$/.test(value);

/**
 * A render is authorized only by a request-only push whose previous remote
 * commit is the exact frozen candidate. Historical requests are checked
 * across fetched branches so the same candidate/request ID cannot render twice.
 */
export const validateRenderCandidate = ({
  request, beforeSha, headSha, changedFiles, priorRequests = [], headCommittedAt = 0,
}) => {
  const errors = [];
  if (!isRecord(request)) return { errors: ["Render candidate request must be a JSON object."] };

  if (!isSha(beforeSha) || /^0{40}$/i.test(beforeSha)) {
    errors.push("A render request cannot be accepted from a new branch or a push without a previous remote commit.");
  }
  if (!isSha(headSha) || /^0{40}$/i.test(headSha)) {
    errors.push("The render request commit SHA is missing or invalid.");
  }
  if (!isSha(request.candidateSha)) {
    errors.push("candidateSha is required and must be a full 40-character commit SHA.");
  } else if (isSha(beforeSha) && request.candidateSha !== beforeSha) {
    errors.push("candidateSha must exactly match the remote branch tip immediately before the request-only commit.");
  }
  if (isSha(headSha) && request.candidateSha === headSha) {
    errors.push("candidateSha must identify the frozen project commit before the render-request commit.");
  }
  if (!isRequestId(request.requestId)) {
    errors.push("requestId must be a unique 1-80 character identifier.");
  }

  if (!Array.isArray(changedFiles) ||
      changedFiles.length !== 1 ||
      changedFiles[0] !== "render-request.json") {
    errors.push("The render-triggering push must change render-request.json only. Push all project files first, then commit the request separately.");
  }

  if (!Array.isArray(priorRequests)) {
    errors.push("Render request history could not be read; refusing to render without duplicate protection.");
  } else if (isSha(headSha) && isSha(request.candidateSha) && isRequestId(request.requestId)) {
    const conflicts = new Map();
    for (const prior of priorRequests) {
      if (!isRecord(prior) || prior.commitSha === headSha) continue;
      if (prior.candidateSha !== request.candidateSha && prior.requestId !== request.requestId) continue;
      if (!isSha(prior.commitSha)) continue;
      const committedAt = Number(prior.committedAt);
      conflicts.set(prior.commitSha, {
        commitSha: prior.commitSha,
        committedAt: Number.isFinite(committedAt) ? committedAt : Number.MAX_SAFE_INTEGER,
      });
    }

    if (conflicts.size > 0) {
      const contenders = [
        ...conflicts.values(),
        {
          commitSha: headSha,
          committedAt: Number.isFinite(Number(headCommittedAt))
            ? Number(headCommittedAt)
            : Number.MAX_SAFE_INTEGER,
        },
      ].sort((a, b) => a.committedAt - b.committedAt || a.commitSha.localeCompare(b.commitSha));

      if (contenders[0].commitSha !== headSha) {
        errors.push("This candidate commit or requestId has already been submitted. Create a genuinely new, validated candidate before requesting another render.");
      }
    }
  }

  return { errors };
};

const git = (args) =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();

const readPriorRequests = (headSha) => {
  const rows = git(["log", "--all", "--format=%H%x09%ct", "--", "render-request.json"]);
  const priorRequests = [];

  for (const row of rows.split(/\r?\n/).filter(Boolean)) {
    const [commitSha, committedAtText] = row.split("\t");
    if (!isSha(commitSha) || commitSha === headSha) continue;

    let content;
    try {
      content = git(["show", `${commitSha}:render-request.json`]);
    } catch {
      // A historical deletion has no request to deduplicate.
      continue;
    }

    try {
      const previous = JSON.parse(content);
      if (isRecord(previous)) {
        priorRequests.push({
          commitSha,
          committedAt: Number(committedAtText),
          candidateSha: previous.candidateSha,
          requestId: previous.requestId,
        });
      }
    } catch {
      // Invalid historical requests could not have passed the render validator.
    }
  }
  return priorRequests;
};

const run = async () => {
  const requestPath = process.argv[2] ?? "render-request.json";
  const beforeSha = process.env.RENDER_BEFORE_SHA;
  const headSha = process.env.GITHUB_SHA;

  let request;
  try {
    request = JSON.parse(await readFile(requestPath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read render candidate request ${requestPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!isSha(beforeSha) || /^0{40}$/i.test(beforeSha) || !isSha(headSha)) {
    const result = validateRenderCandidate({ request, beforeSha, headSha, changedFiles: [], priorRequests: [] });
    throw new Error(result.errors.join("\n"));
  }

  const changedFiles = git(["diff", "--name-only", "--no-renames", beforeSha, headSha])
    .split(/\r?\n/)
    .filter(Boolean);
  const priorRequests = readPriorRequests(headSha);
  const headCommittedAt = Number(git(["show", "-s", "--format=%ct", headSha]));
  const validation = validateRenderCandidate({
    request, beforeSha, headSha, changedFiles, priorRequests, headCommittedAt,
  });

  if (validation.errors.length > 0) throw new Error(validation.errors.join("\n"));

  const output = process.env.GITHUB_OUTPUT;
  if (output) await appendFile(output, `candidate_sha=${request.candidateSha}\n`);
  console.log(`Accepted frozen render candidate ${request.candidateSha} with request ${request.requestId}; push changes only render-request.json.`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
