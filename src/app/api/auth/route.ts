import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface User {
  id: string;
  password: string;
  name: string;
  role: string;
}

export async function POST(request: NextRequest) {
  const { id, password } = await request.json();

  const usersPath = path.join(process.cwd(), "credentials", "users.json");
  const users: User[] = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

  const user = users.find((u) => u.id === id && u.password === password);

  if (!user) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다" }, { status: 401 });
  }

  return NextResponse.json({ name: user.name, role: user.role });
}
