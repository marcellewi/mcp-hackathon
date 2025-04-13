// frontend/sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://03fa09803a972bedb6bee16c00aa7c01@o1076412.ingest.us.sentry.io/4507977127034880",
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});