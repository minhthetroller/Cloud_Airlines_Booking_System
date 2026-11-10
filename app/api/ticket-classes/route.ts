import { listTicketClasses } from "@/lib/server/flights"
import { route } from "@/lib/server/http"

export const GET = route(async () => {
  return { ticketClasses: await listTicketClasses() }
})
