import { UpdateprojectInput } from "../dtos";

export async function handleEndDateChange(
  existing: any,
  data: UpdateprojectInput
) {
  data.submissionMailReminder = false;

  const log = Array.isArray(existing.endDateChangeLog)
    ? existing.endDateChangeLog
    : [];

  log.push({
    oldEndDate: existing.endDate,
    newEndDate: data.endDate,
    changedAt: new Date(),
  });

  data.endDateChangeLog = log as any;
}
