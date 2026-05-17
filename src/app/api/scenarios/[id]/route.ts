import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Scenario } from "@/models/Scenario";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const scenario = await Scenario.findById(id).lean();
    
    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    return NextResponse.json(scenario);
  } catch (error) {
    console.error("Error fetching scenario:", error);
    return NextResponse.json({ error: "Failed to fetch scenario" }, { status: 500 });
  }
}
