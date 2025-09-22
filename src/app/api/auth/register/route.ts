import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, companyName, companySize } = await request.json();

    // Validate required fields
    if (!name || !email || !password || !companyName || !companySize) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and brand in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "CLIENT",
        },
      });

      // Create brand
      const brand = await tx.brand.create({
        data: {
          name: companyName,
          size: companySize,
          userId: user.id,
        },
      });

      return { user, brand };
    });

    // Return success (don't include password in response)
    const { password: _, ...userWithoutPassword } = result.user;
    
    return NextResponse.json(
      { 
        message: "Account created successfully",
        user: userWithoutPassword 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        );
      }
      if (error.message.includes("P6001")) {
        return NextResponse.json(
          { error: "Database connection error. Please try again." },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
