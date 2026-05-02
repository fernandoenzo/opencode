import { Server } from "../../server/server"
import { cmd } from "./cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "@opencode-ai/core/flag/flag"
import { disposeAllInstances } from "../../project/instance-store"

export const ServeCommand = cmd({
  command: "serve",
  builder: (yargs) => withNetworkOptions(yargs),
  describe: "starts a headless opencode server",
  handler: async (args) => {
    if (!Flag.OPENCODE_SERVER_PASSWORD) {
      console.log("Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.")
    }
    const opts = await resolveNetworkOptions(args)
    const server = await Server.listen(opts)
    console.log(`opencode server listening on http://${server.hostname}:${server.port}`)

    await new Promise<void>((resolve) => {
      const shutdown = () => resolve()
      process.on("SIGTERM", shutdown)
      process.on("SIGINT", shutdown)
    })
    try {
      await Promise.race([disposeAllInstances(), new Promise((r) => setTimeout(r, 5000))]).catch(() => {})
    } catch {}
    await server.stop()
  },
})
