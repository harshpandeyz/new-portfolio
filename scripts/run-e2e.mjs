import { npxCommand, npmCommand, run } from "./command.mjs";

run(process.execPath, ["scripts/db-up.mjs"]);
run(npmCommand, ["run", "db:migrate"]);
run(npmCommand, ["run", "db:seed"]);
run(npxCommand, ["--no-install", "playwright", "test", ...process.argv.slice(2)]);
