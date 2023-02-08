import { Session } from "@prisma/client";
import { createUser } from "./users-factory";
import { prisma } from "@/config";
import { User } from "@prisma/client";
import * as jwt from "jsonwebtoken";

export async function createSession(token: string): Promise<Session> {
  const user = await createUser();

  return prisma.session.create({
    data: {
      token: token,
      userId: user.id,
    },
  });
}

export async function loginUser(user: User, expiresIn: number) {
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: expiresIn });

  return prisma.session.create({
    data: {
      token: token,
      userId: user.id,
    },
  });
}
