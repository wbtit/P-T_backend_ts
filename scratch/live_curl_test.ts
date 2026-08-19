import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/config/utils/jwtutils';
import { execSync } from 'child_process';
import prisma from '../src/config/database/client';

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found");
  
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

  const project = await prisma.project.findFirst();
  if (!project) throw new Error("No project found");
  
  const families = await prisma.standardFamily.findMany({ take: 2 });
  if (families.length < 2) throw new Error("Need at least 2 families for tests");
  
  const f1 = families[0].id;
  const f2 = families[1].id;

  const port = process.env.PORT || 5156;
  const baseUrl = `http://localhost:${port}/v1/standards/projects/${project.id}/preferences`;

  const runCurl = (method: string, body?: string) => {
    let cmd = `curl -s -w "\\nHTTP Status: %{http_code}\\n" -X ${method} ${baseUrl} \
      -H "Authorization: Bearer ${token}"`;
    if (body) {
      cmd += ` -H "Content-Type: application/json" -d '${body}'`;
    }
    console.log(`\n--- ${method} ${body || ""} ---`);
    try {
      console.log(execSync(cmd).toString().trim());
    } catch(e: any) {
      console.log(e.stdout.toString().trim());
    }
  };

  // Setup: clear preferences
  await prisma.projectStandardPreference.deleteMany({ where: { projectId: project.id } });

  console.log("TEST 1: POST valid array sets it, GET returns it");
  runCurl("POST", `{"standardFamilyIds": ["${f1}"]}`);
  runCurl("GET");

  console.log("\nTEST 2: POST replaces prior preferences");
  runCurl("POST", `{"standardFamilyIds": ["${f2}"]}`);
  runCurl("GET");

  console.log("\nTEST 3: POST with duplicate ID rejected cleanly (accepted as deduped)");
  runCurl("POST", `{"standardFamilyIds": ["${f1}", "${f1}"]}`);
  runCurl("GET");

  console.log("\nTEST 4: POST with invalid family ID rejected entirely");
  runCurl("POST", `{"standardFamilyIds": ["${f1}", "INVALID_FAM_ID"]}`);
  runCurl("GET");

  process.exit(0);
}

main().catch(console.error);
