import { useSession } from "@tanstack/react-start/server";

export type GateSession = { unlocked?: boolean };

function sessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET is not set");
  return {
    password,
    name: "site-gate",
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export async function getGateSession() {
  return useSession<GateSession>(sessionConfig());
}

export async function requireUnlocked() {
  const session = await getGateSession();
  if (!session.data.unlocked) {
    throw new Response("Locked", { status: 401 });
  }
}
