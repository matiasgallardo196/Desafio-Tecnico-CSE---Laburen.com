import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatMessage } from '../../utils/chat-message.type';
import { PromptBuilder } from '../../utils/prompt-builder';
import { openaiConfig } from '../../config/openai.config';
import { OPENAI_API_KEY } from 'src/config/env.loader';

@Injectable()
export class OpenAiService {
  private readonly apiKey = OPENAI_API_KEY;
  private readonly client: OpenAI;
  private embeddingCache = new Map<string, number[]>();

  constructor() {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY no definido');
    }
    this.client = new OpenAI({
      apiKey: this.apiKey,
      timeout: openaiConfig.timeoutMs,
      maxRetries: openaiConfig.maxRetries,
    });
  }

  async askChat(
    messages: ChatMessage[],
    temperature: number = openaiConfig.temperature,
  ): Promise<string> {
    try {
      const res = await this.client.chat.completions.create({
        model: openaiConfig.model,
        messages,
        temperature,
      });
      const choice = res.choices[0];
      const content = choice?.message?.content;

      if (!content) {
        throw new Error('Respuesta inválida del modelo: content vacío o nulo');
      }

      return content.trim();
    } catch (err) {
      console.error('❌ Error en askChat:', err.message || err);
      return 'Hubo un problema técnico al contactar al asistente. Probá nuevamente en unos segundos.';
    }
  }

  async askRaw(prompt: string, temperature?: number): Promise<string> {
    return this.askChat([{ role: 'user', content: prompt }], temperature);
  }

  async rephraseForUser(
    params: { data: any; intention: string; userMessage?: string; history?: ChatMessage[] },
    temperature?: number,
  ): Promise<string> {
    const prompt = PromptBuilder.buildPrompt(params);

    try {
      const response = await this.askChat(
        [...(params.history || []), { role: 'user', content: prompt }],
        temperature,
      );
      return response;
    } catch (err) {
      console.error('❌ Error en rephraseForUser:', err.message || err);
      return Array.isArray(params.data)
        ? params.data.map((p) => p.name).join(', ')
        : JSON.stringify(params.data);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cached = this.embeddingCache.get(text);
    if (cached) {
      return cached;
    }
    const res = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    const embedding = res.data[0].embedding;
    this.embeddingCache.set(text, embedding);
    return embedding;
  }
}
