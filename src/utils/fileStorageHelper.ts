import fs from "fs"
import path from "path"
import { UPLOAD_BASE_DIR } from "./fileUtil"
import { UserRole } from "@prisma/client"

// ─── Role Classification ───────────────────────────────────────────────────

const EXTERNAL_ROLES = new Set<UserRole>([
  UserRole.CLIENT,
  UserRole.CLIENT_ADMIN,
  UserRole.CLIENT_ACCOUNTANT,
  UserRole.CLIENT_ESTIMATOR,
  UserRole.CLIENT_PROJECT_COORDINATOR,
  UserRole.CLIENT_GENERAL_CONSTRUCTOR,
  UserRole.VENDOR,
  UserRole.VENDOR_ADMIN,
])

export function getUploaderCategory(role: UserRole): "external" | "internal" {
  return EXTERNAL_ROLES.has(role) ? "external" : "internal"
}

// ─── Name Sanitization ─────────────────────────────────────────────────────

/**
 * Converts a human-readable name into a filesystem-safe folder name.
 * Rules:
 *   - Trim whitespace
 *   - Replace spaces with underscores
 *   - Remove characters that are invalid on Windows/Linux/Mac: \ / : * ? " < > |
 *   - Collapse multiple consecutive underscores into one
 *   - Max 80 characters (prevents PATH_MAX issues on deeply nested structures)
 *
 * Examples:
 *   "VILLAGE AT GATEWAY PARK"  → "VILLAGE_AT_GATEWAY_PARK"
 *   "Pace Metals"              → "Pace_Metals"
 *   "ABCD-22"                  → "ABCD-22"
 *   "Automated Test Fab-1Console Test Fab" → "Automated_Test_Fab-1Console_Test_Fab"
 */
export function sanitizeFolderName(name: string): string {
  return name
    .trim()
    .replace(/[\\/:"*?<>|]/g, "")   // remove invalid filesystem chars
    .replace(/\s+/g, "_")           // spaces → underscores
    .replace(/_+/g, "_")            // collapse multiple underscores
    .substring(0, 80)               // max length
}

// ─── Path Builders ─────────────────────────────────────────────────────────

/**
 * Path for project-context modules (RFI, Submittal, ChangeOrder, 
 * DesignDrawings, CoordinationDrawing, BFA, Notes, TeamMeetingNotes etc.)
 *
 * Pattern: {fabricatorName}/{projectIdentifier}/{category}
 * Example: Pace_Metals/PRJ-001_Village_at_Gateway_Park/external
 */
export function buildProjectFilePath(params: {
  fabricatorName: string
  projectCode: string | null
  projectName: string
  category: "external" | "internal"
  entityName?: string
  filename: string
}): string {
  const fabFolder = sanitizeFolderName(params.fabricatorName)

  const projectIdentifier = params.projectCode
    ? `${sanitizeFolderName(params.projectCode)}_${sanitizeFolderName(params.projectName)}`
    : sanitizeFolderName(params.projectName)

  if (params.entityName) {
    return `${fabFolder}/${projectIdentifier}/${params.category}/${sanitizeFolderName(params.entityName)}/${params.filename}`
  }
  return `${fabFolder}/${projectIdentifier}/${params.category}/${params.filename}`
}

/**
 * Path for RFQ files — project does not exist yet at upload time.
 *
 * Pattern: {fabricatorName}/rfq/{rfqIdentifier}/{category}
 * Example: Pace_Metals/rfq/RFQ-0042_Mumbai_Tower/external
 */
export function buildRfqFilePath(params: {
  fabricatorName: string
  rfqSerialNo: string | null
  rfqProjectName: string
  category: "external" | "internal"
  filename: string
}): string {
  const fabFolder = sanitizeFolderName(params.fabricatorName)

  const rfqIdentifier = params.rfqSerialNo
    ? `${sanitizeFolderName(params.rfqSerialNo)}_${sanitizeFolderName(params.rfqProjectName)}`
    : sanitizeFolderName(params.rfqProjectName)

  return `${fabFolder}/rfq/${rfqIdentifier}/${params.category}/${params.filename}`
}

/**
 * Moves both the project folder and its parent RFQ folder
 * into completed_projects/{fabricatorName}/ on project completion.
 *
 * Safe: uses fs.renameSync — atomic on same filesystem.
 * Idempotent: skips move if source doesn't exist.
 */
export async function moveProjectToCompleted(params: {
  fabricatorName: string
  rfqSerialNo: string
  rfqProjectName: string
  projectCode: string | null
  projectName: string
}): Promise<{ movedPaths: string[]; skippedPaths: string[] }> {
  const fabFolder = sanitizeFolderName(params.fabricatorName)

  const rfqIdentifierPrefixed = `${sanitizeFolderName(params.rfqSerialNo)}_${sanitizeFolderName(params.rfqProjectName)}`
  const rfqIdentifierFallback = sanitizeFolderName(params.rfqProjectName)

  const projectIdentifierPrefixed = params.projectCode
    ? `${sanitizeFolderName(params.projectCode)}_${sanitizeFolderName(params.projectName)}`
    : sanitizeFolderName(params.projectName)
  const projectIdentifierFallback = sanitizeFolderName(params.projectName)

  const completedBase = path.join(UPLOAD_BASE_DIR, fabFolder, "completed_projects")
  const completedRfqBase = path.join(completedBase, "rfq")

  // Ensure completed_projects/rfq/ exists
  fs.mkdirSync(completedRfqBase, { recursive: true })

  const movedPaths: string[] = []
  const skippedPaths: string[] = []

  const rfqSrcPrefixed = path.join(UPLOAD_BASE_DIR, fabFolder, "rfq", rfqIdentifierPrefixed)
  const rfqSrcFallback = path.join(UPLOAD_BASE_DIR, fabFolder, "rfq", rfqIdentifierFallback)
  
  let rfqSrc = rfqSrcPrefixed;
  let rfqDestName = rfqIdentifierPrefixed;
  if (!fs.existsSync(rfqSrc) && fs.existsSync(rfqSrcFallback)) {
    rfqSrc = rfqSrcFallback;
    rfqDestName = rfqIdentifierFallback;
  }

  const projSrcPrefixed = path.join(UPLOAD_BASE_DIR, fabFolder, projectIdentifierPrefixed)
  const projSrcFallback = path.join(UPLOAD_BASE_DIR, fabFolder, projectIdentifierFallback)

  let projSrc = projSrcPrefixed;
  let projDestName = projectIdentifierPrefixed;
  if (!fs.existsSync(projSrc) && fs.existsSync(projSrcFallback)) {
    projSrc = projSrcFallback;
    projDestName = projectIdentifierFallback;
  }

  const moves = [
    {
      src: rfqSrc,
      dest: path.join(completedRfqBase, rfqDestName),
      label: "RFQ folder",
    },
    {
      src: projSrc,
      dest: path.join(completedBase, projDestName),
      label: "Project folder",
    },
  ]

  for (const move of moves) {
    if (!fs.existsSync(move.src)) {
      skippedPaths.push(`${move.label}: source not found (${move.src})`)
      continue
    }
    if (fs.existsSync(move.dest)) {
      skippedPaths.push(`${move.label}: destination already exists (${move.dest})`)
      continue
    }
    fs.renameSync(move.src, move.dest)
    movedPaths.push(`${move.label}: ${move.src} → ${move.dest}`)
  }

  return { movedPaths, skippedPaths }
}
