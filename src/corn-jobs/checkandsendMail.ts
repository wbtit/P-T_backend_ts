import prisma from "../config/database/client";
import sendApprovalReminder from "../services/mailServices/approvalMailReminder";
import sendSubmissionReminder from "../services/mailServices/sendSubmissionMailReminder";
import {sendMeetingReminder} from "../services/mailServices/sendMeetingReminder";
import { notifyByRoles } from "../utils/notifyByRole";

// ───────────────────────────────
// Reminder Checker
// ───────────────────────────────
export async function checkAndSendReminders(): Promise<void> {
  console.log("Running daily reminder check...");
  const now = new Date();

  // Normalize today to midnight (00:00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ───────────────────────────────
  // PROJECT REMINDERS
  // ───────────────────────────────
  const projects = await prisma.project.findMany({
    include: {
      manager: {
        select: { email: true },
      },
    },
  });

  for (const project of projects) {
    if (!project.approvalDate || !project.endDate) continue;

    const approvalDate = new Date(project.approvalDate);
    const approvalTomorrow = new Date(approvalDate);
    approvalTomorrow.setDate(approvalTomorrow.getDate() - 1);
    approvalTomorrow.setHours(0, 0, 0, 0);

    // Approval reminder (1 day before)
    if (approvalTomorrow.getTime() === today.getTime()) {
      if (!project.mailReminder) {
        console.log(
          `Attempting to send approval reminder for project: ${project.name}`
        );
        await sendApprovalReminder(project);
      } else {
        console.log(
          `Approval reminder already sent for project: ${project.name}. Skipping.`
        );
      }
    }

    // Submission reminder (1 day before endDate)
    const submissionDate = new Date(project.endDate);
    const submissionTomorrow = new Date(submissionDate);
    submissionTomorrow.setDate(submissionDate.getDate() - 1);
    submissionTomorrow.setHours(0, 0, 0, 0);

    if (submissionTomorrow.getTime() === today.getTime()) {
      if (!project.submissionMailReminder) {
        console.log(
          `Attempting to send submission reminder for project: ${project.name}`
        );
        await sendSubmissionReminder(project);
      } else {
        console.log(
          `Submission reminder already sent for project: ${project.name}. Skipping.`
        );
      }
    }
  }

  // ───────────────────────────────
  // MEETING REMINDERS
  // ───────────────────────────────
  const meetings = await prisma.meeting.findMany({
    include: {
      participants: {
        select: { email: true },
      },
    },
  });

  for (const meeting of meetings) {
    if (!meeting.startTime) continue;

    const startTime = new Date(meeting.startTime);
    const reminderTime = new Date(startTime.getTime() - 15 * 60 * 1000); // 15 min before

    // Check if current time matches reminder time (minute precision)
    if (
      reminderTime.getFullYear() === now.getFullYear() &&
      reminderTime.getMonth() === now.getMonth() &&
      reminderTime.getDate() === now.getDate() &&
      reminderTime.getHours() === now.getHours() &&
      reminderTime.getMinutes() === now.getMinutes()
    ) {
      if (!meeting.reminderSent) {
        console.log(
          `Attempting to send meeting reminder for meeting: ${meeting.title}`
        );
        await sendMeetingReminder(meeting);
        await notifyByRoles(
          [
            "DEPT_MANAGER",
            "PROJECT_MANAGER",
            "TEAM_LEAD",
            "PROJECT_MANAGER_OFFICER",
            "DEPUTY_MANAGER",
            "OPERATION_EXECUTIVE",
            "CLIENT",
            "CLIENT_ADMIN",
            "CLIENT_PROJECT_COORDINATOR",
            "VENDOR",
            "VENDOR_ADMIN",
          ],
          {
            type: "MEETING_REMINDER",
            title: "Meeting Reminder",
            message: `Meeting '${meeting.title}' starts soon.`,
            meetingId: meeting.id,
            startTime: meeting.startTime,
            timestamp: new Date(),
          }
        );
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { reminderSent: true },
        });
      } else {
        console.log(
          `Reminder already sent for meeting: ${meeting.title}. Skipping.`
        );
      }
    }
  }

  console.log("Reminder check completed.");
}
