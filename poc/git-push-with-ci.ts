/* @script

# Usage
$ git add foo.ts
$ git commit -m "add foo.ts"

# push and wait ci

$ deno run -A poc/push-with-ci.ts
Enumerating objects: 7, done.
Counting objects: 100% (7/7), done.
Delta compression using up to 16 threads
Compressing objects: 100% (4/4), done.
Writing objects: 100% (4/4), 475 bytes | 475.00 KiB/s, done.
Total 4 (delta 3), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (3/3), completed with 3 local objects.
To https://github.com/mizchi/ailab.git
   a7321b1..4b10d22  main -> main
✓ main CI · 13516856449
Triggered via push less than a minute ago

JOBS
✓ test in 11s (ID 37767182173)
  ✓ Set up job
  ✓ Checkout repository
  ✓ Setup Deno
  ✓ Run deno check poc/*.ts
  ✓ Run tests
  ✓ Post Checkout repository
  ✓ Complete job

✓ Run CI (13516856449) completed with 'success'
*/
import $ from "jsr:@david/dax";
import { err, ok, type Result } from "npm:neverthrow";

import { parseArgs } from "node:util";

const parsed = parseArgs({
  args: Deno.args,
  options: {
    workflow: { type: "string", short: "w" },
    branch: { type: "string", short: "b" },
  },
});

type WaitCiError =
  | { type: "workflow_not_found"; message: string }
  | { type: "workflow_failed"; message: string };

export async function pushWithWaitCI(): Promise<Result<void, WaitCiError>> {
  // check status
  await $`git status --porcelain`;

  let prevRunId = parsed.values.workflow
    ? await $`gh run list --limit 1 --json databaseId --jq '.[0].databaseId' --workflow "${parsed.values.workflow}"`
      .text()
    : await $`gh run list --limit 1 --json databaseId --jq '.[0].databaseId'`
      .text();
  if (!prevRunId.trim()) {
    console.log("Previous run not found.");
    prevRunId = "<not-found>";
  }

  const branchName = await $`git symbolic-ref --short HEAD`.text();
  await $`git push origin ${parsed.values.branch ?? branchName}`;
  // wait 10 seconds

  const p = $.progress("Waiting for CI to be triggered...");

  await new Promise((resolve) => setTimeout(resolve, 5000));
  let runId: string | undefined = undefined;
  let maxRetry = 3;
  while (maxRetry-- > 0) {
    const currentId =
      await $`gh run list --limit 1 --json databaseId --jq '.[0].databaseId'`
        .text();
    if (prevRunId !== currentId) {
      runId = currentId;
      break;
    }
    p.increment();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  if (!runId) {
    return err({
      type: "workflow_not_found",
      message: "ワークフロー実行が見つかりませんでした。",
    });
  }
  p.finish();

  await $`gh run watch ${runId}`;

  const status =
    await $`gh run view ${runId} --json conclusion --jq '.conclusion'`.text();
  // console.log(status.trim());

  if (status.trim() === "success") {
    return ok(undefined);
  } else {
    console.log("---- CI Log ----");
    await $`gh run view ${runId} --log-failed`.noThrow();

    return err({
      type: "workflow_failed",
      message: `ワークフローが失敗しました: ${status}`,
    });
  }
}

if (import.meta.main) {
  const result = await pushWithWaitCI();
  result.match(
    () => Deno.exit(0),
    (error) => {
      console.error(error.message);
      Deno.exit(1);
    },
  );
}
