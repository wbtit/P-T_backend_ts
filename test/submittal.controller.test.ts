import { Request, Response } from "express";
import { SubmittalController } from "../src/modules/submittals/controllers/submittal.controller";
import * as timeCheckUtil from "../src/config/utils/timeCheck.util";
import { AppError } from "../src/config/utils/AppError";

// Mock the dependencies used inside handleCreateSubmittal
jest.mock("mime", () => ({ getType: jest.fn() }));
jest.mock("../src/config/utils/timeCheck.util");
jest.mock("../src/services/mailServices/mailconfig", () => ({}));
jest.mock("../src/utils/sendNotification", () => ({}));
jest.mock("../src/config/database/client", () => ({}));
jest.mock("../src/modules/submittals/services", () => ({
  SubmittalService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("../src/modules/project/services/projectAssist.service", () => ({
  ProjectAssistService: jest.fn().mockImplementation(() => ({
    assertRfiSubmittalCreateUpdateAccess: jest.fn().mockResolvedValue({}),
  })),
}));

describe("Submittal Controller: Time Window Restriction", () => {
  let controller: SubmittalController;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    controller = new SubmittalController();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should allow ADMIN to create submittal anytime", async () => {
    mockReq = {
      user: { id: "user1", role: "ADMIN" } as any,
      body: { project_id: "p1", description: "Test" },
    };
    (timeCheckUtil.isWithinWorkingHoursIST as jest.Mock).mockReturnValue(false); // Outside hours

    // The method will throw a different error if it proceeds past the time check (e.g. missing files, prisma mock missing)
    // We just want to ensure it DOES NOT throw the 403 time restriction error
    try {
      await controller.handleCreateSubmittal(mockReq as any, mockRes as any);
    } catch (error: any) {
      expect(error.message).not.toContain("Submittal creation is restricted outside of working hours");
    }
  });

  it("should allow DEPUTY_MANAGER to create submittal anytime", async () => {
    mockReq = {
      user: { id: "user1", role: "DEPUTY_MANAGER" } as any,
      body: { project_id: "p1", description: "Test" },
    };
    (timeCheckUtil.isWithinWorkingHoursIST as jest.Mock).mockReturnValue(false); // Outside hours

    try {
      await controller.handleCreateSubmittal(mockReq as any, mockRes as any);
    } catch (error: any) {
      expect(error.message).not.toContain("Submittal creation is restricted outside of working hours");
    }
  });

  it("should block STAFF from creating submittal outside working hours", async () => {
    mockReq = {
      user: { id: "user1", role: "STAFF" } as any,
      body: { project_id: "p1", description: "Test" },
    };
    (timeCheckUtil.isWithinWorkingHoursIST as jest.Mock).mockReturnValue(false); // Outside hours

    await expect(controller.handleCreateSubmittal(mockReq as any, mockRes as any))
      .rejects.toThrow("Submittal creation is restricted outside of working hours");
  });

  it("should block PROJECT_MANAGER from creating submittal outside working hours", async () => {
    mockReq = {
      user: { id: "user1", role: "PROJECT_MANAGER" } as any,
      body: { project_id: "p1", description: "Test" },
    };
    (timeCheckUtil.isWithinWorkingHoursIST as jest.Mock).mockReturnValue(false); // Outside hours

    await expect(controller.handleCreateSubmittal(mockReq as any, mockRes as any))
      .rejects.toThrow("Submittal creation is restricted outside of working hours");
  });

  it("should allow STAFF to create submittal inside working hours", async () => {
    mockReq = {
      user: { id: "user1", role: "STAFF" } as any,
      body: { project_id: "p1", description: "Test" },
    };
    (timeCheckUtil.isWithinWorkingHoursIST as jest.Mock).mockReturnValue(true); // Inside hours

    try {
      await controller.handleCreateSubmittal(mockReq as any, mockRes as any);
    } catch (error: any) {
      expect(error.message).not.toContain("Submittal creation is restricted outside of working hours");
    }
  });
});
