# Load checks

`npm run load:public` exercises only bounded, read-only public routes. Defaults: localhost, 20 seconds, concurrency 10. Override with `LOAD_BASE_URL`, `LOAD_DURATION_SECONDS`, and `LOAD_CONCURRENCY`.

The script refuses non-local hosts unless `LOAD_TEST_ALLOW_PRODUCTION=true`. Obtain infrastructure-owner authorization first. It does not create users, initiate payments, deliver webhooks, or test destructive claim races. Run those scenarios in a dedicated staging stack with test payment credentials and database metrics enabled; assert one current claim, idempotent events, clean conflicts, and bounded connection/lock wait times.
