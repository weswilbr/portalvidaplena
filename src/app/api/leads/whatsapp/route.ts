import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, message } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        notes: message || "Mensagem enviada via WhatsApp",
        source: "WhatsApp",
        status: "NEW",
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error("Error creating WhatsApp lead:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
