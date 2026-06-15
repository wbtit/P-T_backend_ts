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
  filename: string
}): string {
  const fabFolder = sanitizeFolderName(params.fabricatorName)

  const projectIdentifier = params.projectCode
    ? `${sanitizeFolderName(params.projectCode)}_${sanitizeFolderName(params.projectName)}`
    : sanitizeFolderName(params.projectName)

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
