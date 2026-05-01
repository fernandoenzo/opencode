import { Effect } from "effect"
import { Server } from "../../server/server"
import { effectCmd } from "../effect-cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "@opencode-ai/core/flag/flag"
import { InstanceStore } from "@/project/instance-store"

export const ServeCommand = effectCmd({
  command: "serve",
  builder: (yargs) => withNetworkOptions(yargs),
  describe: "starts a headless opencode server",
  // Server loads instances per-request via x-opencode-directory header — no
  // need for an ambient project InstanceContext at startup.
  instance: false,
  handler: Effect.fn("Cli.serve")(function* (args) {
    if (!Flag.OPENCODE_SERVER_PASSWORD) {
      console.log("Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.")
    }
    const opts = yield* resolveNetworkOptions(args)
    const server = yield* Effect.promise(() => Server.listen(opts))
    console.log(`opencode server listening on http://${server.hostname}:${server.port}`)

    yield* Effect.callback<void>((resume) => {
      const shutdown = () => resume(Effect.void)
      process.on("SIGTERM", shutdown)
      process.on("SIGINT", shutdown)
      return Effect.sync(() => {
        process.off("SIGTERM", shutdown)
        process.off("SIGINT", shutdown)
      })
    })
    yield* InstanceStore.Service.use((store) => store.disposeAll()).pipe(Effect.ignore)
    yield* Effect.promise(() => server.stop())
  }),
})