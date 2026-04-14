import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, randomBytes } from 'crypto';
import { Webhook } from './webhook.entity';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Webhook)
    private readonly webhooksRepo: Repository<Webhook>,
  ) {}

  async register(tenantId: string, url: string, triggerOn = 'ALL_RISK'): Promise<{
    id: string;
    url: string;
    signingSecret: string;
    triggerOn: string;
    message: string;
  }> {
    const signingSecret = randomBytes(32).toString('hex');
    const webhook = await this.webhooksRepo.save(
      this.webhooksRepo.create({ tenantId, url, signingSecret, triggerOn }),
    );
    return {
      id: webhook.id,
      url: webhook.url,
      signingSecret: webhook.signingSecret,
      triggerOn: webhook.triggerOn,
      message: 'Webhook registered. Store the signing_secret — verify the X-Signature-256 header on each delivery.',
    };
  }

  async list(tenantId: string) {
    const hooks = await this.webhooksRepo.find({ where: { tenantId, active: true } });
    // Never return the secret in list responses
    return hooks.map(({ signingSecret: _, ...rest }) => rest);
  }

  async delete(tenantId: string, id: string) {
    await this.webhooksRepo.update({ id, tenantId }, { active: false });
  }

  /**
   * fireForAlert — called by RiskService after saving a HIGH/CRITICAL alert.
   * Sends an HMAC-signed POST to all active webhooks for the tenant.
   * Non-blocking: failures are logged but do not affect the caller.
   */
  async fireForAlert(
    tenantId: string,
    alert: { id: string; severity: string; title: string; description: string },
  ) {
    const hooks = await this.webhooksRepo.find({ where: { tenantId, active: true } });

    for (const hook of hooks) {
      if (hook.triggerOn === 'CRITICAL_RISK' && alert.severity !== 'CRITICAL') continue;
      if (hook.triggerOn === 'HIGH_RISK' && !['HIGH', 'CRITICAL'].includes(alert.severity)) continue;

      const payload = JSON.stringify({
        event: 'risk_alert',
        tenantId,
        alert: { id: alert.id, severity: alert.severity, title: alert.title, description: alert.description },
        firedAt: new Date().toISOString(),
      });

      const signature = `sha256=${createHmac('sha256', hook.signingSecret).update(payload).digest('hex')}`;

      fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature-256': signature,
          'X-Privacy-Audit-Event': 'risk_alert',
        },
        body: payload,
        signal: AbortSignal.timeout(8000),
      }).catch((err) => {
        this.logger.warn(`Webhook delivery failed for ${hook.id}: ${err.message}`);
      });
    }
  }
}
