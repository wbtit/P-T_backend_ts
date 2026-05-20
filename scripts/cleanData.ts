import prisma from "../src/config/database/client";

async function cleanData() {
  console.log("Starting data cleaning process...");

  try {
    await prisma.$transaction([
      // 1. Delete Invoices & Items
      prisma.invoiceItem.deleteMany(),
      prisma.invoice.deleteMany(),

      // 2. Delete Change Orders related
      prisma.cOResponse.deleteMany(),
      prisma.changeOrdertable.deleteMany(),
      prisma.changeOrderVersion.deleteMany(),
      prisma.changeOrder.deleteMany(),

      // 3. Delete Submittals related
      prisma.submittalsResponse.deleteMany(),
      prisma.submittalVersion.deleteMany(),
      prisma.submittals.deleteMany(),

      // 4. Delete RFI related
      prisma.rFIResponse.deleteMany(),
      prisma.rFI.deleteMany(),

      // 5. Delete Estimations related
      prisma.estimationLineItem.deleteMany(),
      prisma.estimationLineItemGroup.deleteMany(),
      prisma.estimationTaskAllocation.deleteMany(),
      prisma.estimationTask.deleteMany(),
      prisma.estimationResponse.deleteMany(),
      prisma.estimation.deleteMany(),

      // 6. Delete RFQ related
      prisma.rFQFollowUp.deleteMany(),
      prisma.rFQResponse.deleteMany(),
      prisma.vendorQuota.deleteMany(),
      prisma.vendor.deleteMany(),
      prisma.rFQ.deleteMany(),

      // 7. Delete Tasks & Logs
      prisma.workingHours.deleteMany(),
      prisma.comment.deleteMany(),
      prisma.taskFlag.deleteMany(),
      prisma.taskAlert.deleteMany(),
      prisma.taskAllocation.deleteMany(),
      prisma.task.deleteMany(),

      // 8. Delete Milestones related
      prisma.mileStoneResponse.deleteMany(),
      prisma.mileStoneVersion.deleteMany(),
      prisma.mileStone.deleteMany(),

      // 9. Delete WBS / Project Structure
      prisma.projectLineItem.deleteMany(),
      prisma.projectWbs.deleteMany(),
      prisma.projectBundle.deleteMany(),
      prisma.projectBundleSelection.deleteMany(),
      prisma.wbsLineItemTemplate.deleteMany(),
      prisma.wbsTemplate.deleteMany(),
      prisma.wbsBundleTemplate.deleteMany(),

      // 10. Delete Project Metadata
      prisma.jobStudy.deleteMany(),
      prisma.teamMeetingNoteResponse.deleteMany(),
      prisma.teamMeetingNotes.deleteMany(),
      prisma.notes.deleteMany(),
      prisma.projectAssist.deleteMany(),
      prisma.projectStageHistory.deleteMany(),
      prisma.designDrawingsResponses.deleteMany(),
      prisma.designDrawings.deleteMany(),
      prisma.projectProgressReportResponse.deleteMany(),
      prisma.projectProgressReport.deleteMany(),
      prisma.coordinationDrawingResponse.deleteMany(),
      prisma.coordinationDrawing.deleteMany(),
      prisma.clientCommunication.deleteMany(),
      prisma.project.deleteMany(),

      // 11. Delete Meetings
      prisma.meetingAttendee.deleteMany(),
      prisma.meeting.deleteMany(),

      // 12. Delete Analytics & System Logs
      prisma.managerEstimationScore.deleteMany(),
      prisma.managerBiasRecord.deleteMany(),
      prisma.employeePerformanceScore.deleteMany(),
      prisma.teamEfficiencyScore.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.cronLog.deleteMany(),
      prisma.fileShareLink.deleteMany(),
      prisma.loginAttempt.deleteMany(),
      prisma.ipChallenge.deleteMany(),
      prisma.userSession.deleteMany(),
      prisma.userTrustedIp.deleteMany(),
    ]);

    console.log("Data cleaning completed successfully.");
    console.log("Preserved: Users, Teams, Departments, Fabricators, Branches, Accounts, Connection Designers, and Chat data.");
  } catch (error) {
    console.error("Error during data cleaning:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanData();
