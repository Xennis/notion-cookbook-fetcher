import * as ff from '@google-cloud/functions-framework';
import {Client, isFullPage, iteratePaginatedAPI} from "@notionhq/client";

import {processFn} from "./action";

// Config
const accessToken = process.env.NOTION_ACCESS_TOKEN
const databaseId = process.env.NOTION_DATABASE_ID
if (!accessToken) {
  throw new Error("no databaseId provided")
}
const createdAfter = new Date(2000, 1, 1, 0, 0, 0, 0)
const notionTimeoutMs = 1000 * 10
const maxItems = 2

const notionClient = new Client({
  auth: accessToken,
  timeoutMs: notionTimeoutMs,
})

ff.http('updateGET', async (req: ff.Request, res: ff.Response) => {
  const result = await update()
  res.send(`${result}`);
});

const update = async () => {
  let counter = 0
  for await (const item of iteratePaginatedAPI(notionClient.databases.query, {
    database_id: databaseId!,
    page_size: Math.min(100, maxItems),
    filter: createdAfter
        ? {
          timestamp: "created_time",
          created_time: {
            on_or_after: createdAfter.toISOString(),
          },
        }
        : undefined,
  })) {
    if (counter++ > maxItems) {
      break
    }
    if (isFullPage(item)) {
      await processFn(notionClient, item)
    }
  }
  return counter
}
