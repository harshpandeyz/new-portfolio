import { npmCommand, run } from "./command.mjs";

run(process.execPath, ["scripts/db-up.mjs"]);
run(process.execPath, ["scripts/db-test-reset.mjs"]);
run(npmCommand, ["run", "test", "--workspace", "@hp/api"]);
