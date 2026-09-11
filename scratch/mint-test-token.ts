import dotenv from "dotenv";
dotenv.config();
import { generateToken } from "../src/config/utils/jwtutils";
import prisma from "../src/config/database/client";

(async () => {
  const user = await prisma.user.findFirst({ select: { id: true, email: true, username: true, role: true } });
  if (!user) { console.error("no user found"); process.exit(1); }
  const token = generateToken({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role as any,
  });
  console.log(token);
  process.exit(0);
})();
