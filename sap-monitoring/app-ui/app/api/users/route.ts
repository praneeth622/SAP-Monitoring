import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const users = await prisma.user.findMany()
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const user = await prisma.user.create({
      data: json,
    })
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Error creating user' }, { status: 500 })
  }
}
