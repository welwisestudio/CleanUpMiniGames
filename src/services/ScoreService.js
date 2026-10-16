// Score (Step 11): computes the agreed metric from the save and sends it when it improves.
// Sent only after the save holding it was written; duplicates are skipped; a failed send is
// retried on the next improvement / start. Disabled until the metric is approved (SCORE.enabled).
export class ScoreService {
  constructor({ save, platform, config, rewards }) {
    this.save = save;
    this.platform = platform;
    this.config = config;
    this.lastSent = null;
    this.busy = false;
    rewards?.on?.('granted', (r) => {
      if (r?.operationId?.startsWith('complete:')) Promise.resolve(r.savePromise).then(() => this.report(), () => {});
    });
  }

  value() {
    const levels = this.save.loaded ? this.save.get('levels') : {};
    return Object.values(levels ?? {}).filter((e) => e?.completed).length;
  }

  async report() {
    if (!this.config.enabled || !this.platform.capabilities?.score || this.busy || !this.save.loaded) return 'skipped';
    const v = this.value();
    if (this.lastSent !== null && v <= this.lastSent) return 'unchanged';
    this.busy = true;
    try {
      await this.platform.sendScore(v);
      this.lastSent = v;
      return 'sent';
    } catch (e) {
      this.platform.reportWarning?.('score send failed', e);
      return 'error';
    } finally {
      this.busy = false;
    }
  }
}
