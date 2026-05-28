export function computeSubmittalStatus(submittal: any): any {
  if (!submittal) return submittal;

  const versionCreatedAt = submittal.currentVersion?.createdAt
    ? new Date(submittal.currentVersion.createdAt)
    : (submittal.date ? new Date(submittal.date) : new Date());

  const now = new Date();
  const diffMs = now.getTime() - versionCreatedAt.getTime();

  // Production: 48 hours threshold
  const diffHours = diffMs / (1000 * 60 * 60);
  const isThresholdPassed = diffHours >= 48;

  // Dev / Test: 1 minute threshold (uncomment to test)
  // const diffMinutes = diffMs / (1000 * 60);
  // const isThresholdPassed = diffMinutes >= 1;

  let wbtStatus = "SENT";
  let status = "RECEIVED"; // client status

  if (submittal.bfaStatus) {
    wbtStatus = "BFA_RECEIVED";
    status = "BFA_SENT";
  } else if (isThresholdPassed) {
    wbtStatus = "WAITING_FOR_BFA";
    status = "WAITING_FOR_BFA";
  }

  return {
    ...submittal,
    wbtStatus,
    status,
  };
}
