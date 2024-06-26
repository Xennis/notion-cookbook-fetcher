import * as ff from '@google-cloud/functions-framework';
import {Client, isFullPage, iteratePaginatedAPI} from "@notionhq/client";

import {processFn} from "./action";
import {type BrowserContext, chromium as playwright} from "playwright";
import chromium from "@sparticuz/chromium";

// Config
const accessToken = process.env.NOTION_ACCESS_TOKEN
const databaseId = process.env.NOTION_DATABASE_ID
if (!accessToken) {
  throw new Error("no databaseId provided")
}
const createdAfter = new Date(2024, 3, 25, 0, 0, 0, 0)
const notionTimeoutMs = 1000 * 10
const maxItems = 100

const notionClient = new Client({
  auth: accessToken,
  timeoutMs: notionTimeoutMs,
})
let context: BrowserContext | null = null

ff.http('updateGET', async (req: ff.Request, res: ff.Response) => {
  const result = await update()
  res.send(`${result}`);
});

// It's expensive to launch the browser. Only do if items are found.
const getOrCreateContext = async () => {
  if (context === null) {
    const browser = await playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless === true ? chromium.headless : undefined,
    })
    context = await browser.newContext()
  }
  return context
}

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
          // property: "Tags",
          // multi_select: {
          //   contains: "TODO"
          // }
        }
        : undefined,
  })) {
    if (counter++ > maxItems) {
      break
    }
    if (isFullPage(item)) {
      await processFn(notionClient, await getOrCreateContext(), item)
    }
  }

  // await browser.close()
  return counter
}
