import mongoose, { Schema, model, models } from "mongoose";

export interface IScenario {
  name: string;
  description?: string;
  snapshot: any; // Mixed type for the physics snapshot payload
  createdAt: Date;
}

const ScenarioSchema = new Schema<IScenario>({
  name: { type: String, required: true },
  description: { type: String },
  snapshot: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Scenario = models.Scenario || model<IScenario>("Scenario", ScenarioSchema);
