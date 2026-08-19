import express from "express";
import { standardsRoutes } from "../src/modules/standards/routes";
import prisma from "../src/config/database/client";
import { sign } from "jsonwebtoken";
import { JWT_SECRET } from "../src/config/utils/jwtutils";
import http from "http";

const app = express();
app.use(express.json());
// Mock auth middleware for the test to pass `req.user`
app.use((req, res, next) => {
  req.headers.authorization = "Bearer " + sign({ id: "test", role: "ADMIN" }, JWT_SECRET);
  next();
});
app.use("/v1/standards", standardsRoutes);

describe("Project Preferences Endpoints", () => {
  let token: string;
  let projectId: string;
  let fam1Id: string;
  let fam2Id: string;
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    // Spin up local test server
    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}/v1/standards/projects`;

    // 1. Setup user and token
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");
    token = sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: "1h" });

    // 2. Setup standard families
    const f1 = await prisma.standardFamily.create({
      data: { id: "EP_FAM_1", familyCode: "EP1", edition: "1", isDefault: false }
    });
    fam1Id = f1.id;
    const f2 = await prisma.standardFamily.create({
      data: { id: "EP_FAM_2", familyCode: "EP2", edition: "1", isDefault: false }
    });
    fam2Id = f2.id;

    // 3. Setup project
    const p = await prisma.project.create({
      data: {
        name: "TestProj_EP_" + Date.now(),
        projectNumber: "TP_EP_" + Date.now(),
        description: "Test",
        fabricatorID: (await prisma.fabricator.findFirst())!.id,
        departmentID: (await prisma.department.findFirst())!.id,
        managerID: user.id
      }
    });
    projectId = p.id;
  });

  afterAll(async () => {
    await prisma.projectStandardPreference.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.standardFamily.deleteMany({ where: { id: { in: [fam1Id, fam2Id] } } });
    server.close();
  });

  const doFetch = async (method: string, path: string, body?: any) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, body: (await res.json().catch(() => null)) as any };
  };

  it("POST with valid array sets preferences and GET returns them", async () => {
    const postRes = await doFetch("POST", `/${projectId}/preferences`, { standardFamilyIds: [fam1Id] });
    expect(postRes.status).toBe(200);

    const getRes = await doFetch("GET", `/${projectId}/preferences`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.standardFamilyIds).toEqual([fam1Id]);
  });

  it("POST replaces prior preferences", async () => {
    const postRes = await doFetch("POST", `/${projectId}/preferences`, { standardFamilyIds: [fam2Id] });
    expect(postRes.status).toBe(200);

    const getRes = await doFetch("GET", `/${projectId}/preferences`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.standardFamilyIds).toEqual([fam2Id]);
  });

  it("POST with duplicate ID is rejected cleanly", async () => {
    const postRes = await doFetch("POST", `/${projectId}/preferences`, { standardFamilyIds: [fam1Id, fam1Id] });
    expect(postRes.status).toBe(200); // Because we implemented deduping!
    
    const getRes = await doFetch("GET", `/${projectId}/preferences`);
    expect(getRes.body.standardFamilyIds).toEqual([fam1Id]);
  });

  it("POST with invalid family ID is rejected cleanly", async () => {
    const postRes = await doFetch("POST", `/${projectId}/preferences`, { standardFamilyIds: [fam1Id, "INVALID_ID"] });
    expect(postRes.status).toBe(400);
    expect(postRes.body.message).toBe("One or more standardFamilyIds are invalid");
  });
});
