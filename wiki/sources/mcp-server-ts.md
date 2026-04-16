# mcp-server.ts

> Source summary for the MCP server entry point — defines 11 MCP tools and connects via stdio transport.

**Topics:** mcp, source, server, tools
**Related:** [[entities/mcp-server]], [[entities/api-routes]], [[concepts/design-to-code]]
**Source:** `mcp-server.ts`

---

## File Overview

- **Lines:** ~270
- **Dependencies:** `@modelcontextprotocol/sdk`, `zod`
- **Run:** `npm run mcp` → `node --import tsx mcp-server.ts`

## Structure

1. **API helper** (L1-17) — `apiCall()` function that fetches from the Next.js API with JSON headers and error handling.
2. **Server init** (L19-22) — Creates `McpServer` with name `figma-clone`, version `2.0.0`.
3. **Design-to-code tools** (L28-180) — 5 tools: `get_design_context`, `get_metadata`, `export_code`, `get_variable_defs`, `search_design`.
4. **Canvas CRUD tools** (L185-255) — 6 tools: `create_object`, `list_objects`, `get_object`, `update_object`, `delete_object`, `clear_canvas`.
5. **Main** (L259-265) — Connects server to `StdioServerTransport` and starts.

## Key Detail

All tools are thin HTTP proxies — they format parameters, call the appropriate API endpoint, and format the response as MCP text content. No business logic lives in this file; it all delegates to the API routes which use `lib/codegen.ts` and `lib/server-state.ts`.
