/**
 * Brings up the services jobs and tests need, so `sql()`, `tx()` and `email()`
 * work there the same way they do in an `@rpc` handler.
 */
import { Services } from "@elements/app";
import config from "#config";

Services.start(config);
