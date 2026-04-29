import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AiProviderSetting,
  AiProviderSettingDocument,
  AiProvider,
} from './schemas/ai-provider-setting.schema';
import { encrypt, decrypt } from './encryption.util';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiResponse {
  content: string;
  provider: AiProvider;
  model: string;
}

/**
 * AiOrchestrationService
 *
 * Single entry point for all AI calls in the platform.
 * Reads the active provider from MongoDB and routes to the correct adapter.
 * Provider + API key are managed via the /dev/ai-providers endpoints.
 */
@Injectable()
export class AiOrchestrationService {
  private readonly logger = new Logger(AiOrchestrationService.name);

  constructor(
    @Optional()
    @InjectModel(AiProviderSetting.name)
    private readonly settingModel: Model<AiProviderSettingDocument> | null,
  ) {}

  // ── Provider Management ──────────────────────────────────────────────────

  async listProviders(): Promise<AiProviderSettingDocument[]> {
    if (!this.settingModel) return [];
    return this.settingModel
      .find({}, { encryptedApiKey: 0 })
      .sort({ isActive: -1, createdAt: 1 })
      .lean()
      .exec() as Promise<AiProviderSettingDocument[]>;
  }

  async addProvider(dto: {
    provider: AiProvider;
    label: string;
    model: string;
    apiKey: string;
    updatedBy?: string;
  }): Promise<AiProviderSettingDocument> {
    if (!this.settingModel) throw new NotFoundException('MongoDB not configured');
    const doc = await this.settingModel.create({
      provider: dto.provider,
      label: dto.label,
      model: dto.model,
      encryptedApiKey: encrypt(dto.apiKey),
      isActive: false,
      updatedBy: dto.updatedBy ?? 'dev',
    });
    this.logger.log(`Added AI provider: ${dto.provider} / ${dto.model}`);
    return doc;
  }

  async activateProvider(id: string, updatedBy = 'dev'): Promise<void> {
    if (!this.settingModel) throw new NotFoundException('MongoDB not configured');
    const target = await this.settingModel.findById(id);
    if (!target) throw new NotFoundException(`Provider ${id} not found`);
    // Deactivate all, then activate the chosen one
    await this.settingModel.updateMany({}, { isActive: false });
    await this.settingModel.findByIdAndUpdate(id, { isActive: true, updatedBy });
    this.logger.log(
      `Activated AI provider: ${target.provider} / ${target.model}`,
    );
  }

  async deleteProvider(id: string): Promise<void> {
    if (!this.settingModel) throw new NotFoundException('MongoDB not configured');
    await this.settingModel.findByIdAndDelete(id);
    this.logger.log(`Deleted AI provider setting: ${id}`);
  }

  async getActiveProvider(): Promise<AiProviderSettingDocument | null> {
    if (!this.settingModel) return null;
    return this.settingModel.findOne({ isActive: true }).exec();
  }

  // ── AI Calls ─────────────────────────────────────────────────────────────

  /**
   * chat() — send a multi-turn conversation to the active AI provider.
   * Used by the AI Chat feature.
   */
  async chat(messages: AiMessage[]): Promise<AiResponse> {
    const setting = await this.resolveActiveSetting();
    const apiKey = decrypt(setting.encryptedApiKey);

    switch (setting.provider) {
      case 'claude':
        return this.claudeChat(apiKey, setting.model, messages);
      case 'gemini':
        return this.geminiChat(apiKey, setting.model, messages);
      case 'openai':
        return this.openaiChat(apiKey, setting.model, messages);
    }
  }

  /**
   * analyse() — send a single analysis prompt to the active AI provider.
   * Used by the Risk Analysis cron and any one-shot analysis calls.
   */
  async analyse(prompt: string): Promise<AiResponse> {
    return this.chat([{ role: 'user', content: prompt }]);
  }

  // ── Private adapters ──────────────────────────────────────────────────────

  private async resolveActiveSetting(): Promise<AiProviderSettingDocument> {
    const setting = await this.getActiveProvider();
    if (setting) return setting;

    // Fallback: if no DB provider is configured, use ANTHROPIC_API_KEY from env
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey) {
      this.logger.warn(
        'No active AI provider in DB — falling back to ANTHROPIC_API_KEY env var',
      );
      return {
        provider: 'claude',
        model: 'claude-opus-4-6',
        encryptedApiKey: encrypt(envKey),
        isActive: true,
        label: 'env-fallback',
      } as unknown as AiProviderSettingDocument;
    }

    throw new NotFoundException(
      'No active AI provider configured. Add one via POST /api/dev/ai-providers and activate it.',
    );
  }

  private async claudeChat(
    apiKey: string,
    model: string,
    messages: AiMessage[],
  ): Promise<AiResponse> {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const content =
      response.content[0].type === 'text' ? response.content[0].text : '';
    return { content, provider: 'claude', model };
  }

  private async geminiChat(
    apiKey: string,
    model: string,
    messages: AiMessage[],
  ): Promise<AiResponse> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const lastMessage = messages[messages.length - 1];

    const chat = geminiModel.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const content = result.response.text();
    return { content, provider: 'gemini', model };
  }

  private async openaiChat(
    apiKey: string,
    model: string,
    messages: AiMessage[],
  ): Promise<AiResponse> {
    // Dynamic import — openai package is optional (npm install openai to enable)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    let OpenAI: any;
    try {
      OpenAI = require('openai').default ?? require('openai');
    } catch {
      throw new Error('openai package not installed. Run: npm install openai');
    }
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      messages: messages.map((m: AiMessage) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: 2048,
    });
    const content = response.choices[0]?.message?.content ?? '';
    return { content, provider: 'openai', model };
  }
}
