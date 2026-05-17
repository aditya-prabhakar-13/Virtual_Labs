import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Scenario } from "@/models/Scenario";

export async function GET() {
  try {
    await connectDB();
    // Return all scenarios but exclude the heavy snapshot payload
    const scenarios = await Scenario.find({}).select("-snapshot").sort({ createdAt: -1 }).lean();
    return NextResponse.json(scenarios);
  } catch (error) {
    console.error("Error fetching scenarios:", error);
    return NextResponse.json({ error: "Failed to fetch scenarios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, snapshot } = body;

    if (!name || !snapshot) {
      return NextResponse.json({ error: "Name and snapshot are required" }, { status: 400 });
    }

    await connectDB();
    const scenario = await Scenario.create({
      name,
      description,
      snapshot,
    });

    return NextResponse.json(scenario, { status: 201 });
  } catch (error) {
    console.error("Error creating scenario:", error);
    return NextResponse.json({ error: "Failed to create scenario" }, { status: 500 });
  }
}
