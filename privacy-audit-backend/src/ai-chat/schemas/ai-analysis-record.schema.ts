import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiAnalysisRecordDocument = AiAnalysisRecord & Document;

export interface AnalysisFinding {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  suggestedAction: string;
  affectedEventCount: number;
}

@Schema({ timestamps: true, collection: 'ai_analysis_records' })
export class AiAnalysisRecord {
  @Prop({ required: true, index: true })
  tenantId: string;

  /** Which AI provider ran this analysis */
  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  model: string;

  /** Number of events analysed */
  @Prop({ required: true })
  eventCount: number;

  /** The full statistical summary sent to the AI (for audit trail) */
  @Prop({ type: Object })
  analysisSummary: Record<string, unknown>;

  /** Sample event IDs included in analysis */
  @Prop({ type: [String], default: [] })
  sampleEventIds: string[];

  /** Parsed findings from AI response */
  @Prop({
    type: [
      {
        severity: String,
        title: String,
        description: String,
        suggestedAction: String,
        affectedEventCount: Number,
      },
    ],
    default: [],
  })
  findings: AnalysisFinding[];

  /** Raw AI response (for debugging/audit) */
  @Prop()
  rawResponse: string;

  /** When the analysis period started (e.g. last 24h) */
  @Prop()
  periodStart: Date;

  @Prop()
  periodEnd: Date;
}

export const AiAnalysisRecordSchema =
  SchemaFactory.createForClass(AiAnalysisRecord);
