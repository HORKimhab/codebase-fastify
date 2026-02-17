import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

type GuardMode = 'skip' | 'protect' | 'strict';

interface SpamGuardRouteConfig {
  spamGuard?: boolean | GuardMode;
}

const toBool = (value: string | undefined, fallback: boolean) => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const toInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toList = (value: string | undefined, fallback: string[]) => {
  if (!value?.trim()) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

const parseTimeWindow = (value: string | undefined, fallback: string) => {
  if (!value?.trim()) {
    return fallback;
  }

  return value.trim();
};

const normalizeMode = (value: unknown, fallback: GuardMode): GuardMode => {
  if (value === true) {
    return 'protect';
  }

  if (value === false) {
    return 'skip';
  }

  if (value === 'skip' || value === 'protect' || value === 'strict') {
    return value;
  }

  return fallback;
};

export default fp(
  async function spamGuardPlugin(fastify) {
    const enabled = toBool(process.env.SPAM_GUARD_ENABLED, true);

    if (!enabled) {
      fastify.log.info('Spam guard is disabled');
      return;
    }

    const globalRateLimitEnabled = toBool(process.env.SPAM_GLOBAL_RATE_LIMIT, true);
    const defaultMode = normalizeMode(process.env.SPAM_GUARD_DEFAULT_MODE, 'protect');
    const skipPrefixes = toList(process.env.SPAM_GUARD_SKIP_PREFIXES, ['/swagger/docs', '/ping']);

    const blockedAgents = toList(process.env.SPAM_GUARD_BLOCKED_AGENTS, [
      'curl',
      'wget',
      'python-requests',
      'httpie',
      'scrapy',
      'nikto',
      'sqlmap'
    ]);

    const strictBlockedAgents = toList(process.env.SPAM_GUARD_STRICT_BLOCKED_AGENTS, [
      'bot',
      'crawler',
      'spider',
      'headless'
    ]);

    const requireUserAgent = toBool(process.env.SPAM_GUARD_REQUIRE_USER_AGENT, false);
    const strictRequireUserAgent = toBool(process.env.SPAM_GUARD_STRICT_REQUIRE_USER_AGENT, true);

    if (globalRateLimitEnabled) {
      await fastify.register(rateLimit, {
        global: true,
        max: toInt(process.env.SPAM_RATE_LIMIT_MAX, 60),
        timeWindow: parseTimeWindow(process.env.SPAM_RATE_LIMIT_WINDOW, '1m'),
        addHeaders: {
          'x-ratelimit-limit': true,
          'x-ratelimit-remaining': true,
          'x-ratelimit-reset': true,
          'retry-after': true
        },
        keyGenerator: (request) => {
          const routeKey = request.routeOptions?.url ?? request.url;
          return `${request.ip}:${request.method}:${routeKey}`;
        },
        allowList: (request) => {
          const path = (request.url || '/').split('?')[0] || '/';
          return skipPrefixes.some((prefix) => path.startsWith(prefix));
        }
      });
    }

    fastify.addHook('onRequest', async (request, reply) => {
      const path = (request.url || '/').split('?')[0] || '/';

      if (skipPrefixes.some((prefix) => path.startsWith(prefix))) {
        return;
      }

      const routeConfig = (request.routeOptions?.config ?? {}) as SpamGuardRouteConfig;
      const mode = normalizeMode(routeConfig.spamGuard, defaultMode);

      if (mode === 'skip') {
        return;
      }

      const userAgentRaw = request.headers['user-agent'];
      const userAgent = typeof userAgentRaw === 'string' ? userAgentRaw.toLowerCase() : '';

      const shouldRequireUserAgent = mode === 'strict' ? strictRequireUserAgent : requireUserAgent;

      if (shouldRequireUserAgent && !userAgent) {
        request.log.warn({ path, ip: request.ip, mode }, 'Blocked request without user-agent');
        return reply.code(403).send({ error: 'Forbidden client', reason: 'missing user-agent' });
      }

      const signatures =
        mode === 'strict' ? Array.from(new Set([...blockedAgents, ...strictBlockedAgents])) : blockedAgents;

      if (userAgent && signatures.some((signature) => userAgent.includes(signature))) {
        request.log.warn({ path, ip: request.ip, mode, userAgent }, 'Blocked request from blocked client signature');
        return reply.code(403).send({ error: 'Forbidden client', reason: 'blocked user-agent' });
      }
    });

    fastify.log.info(
      {
        globalRateLimitEnabled,
        defaultMode,
        skipPrefixes,
        blockedAgentCount: blockedAgents.length,
        strictBlockedAgentCount: strictBlockedAgents.length
      },
      'Spam guard initialized'
    );
  },
  {
    name: 'spam-guard'
  }
);
