import {Client, isFullPage, iteratePaginatedAPI} from "@notionhq/client";
import type {PageObjectResponse} from "@notionhq/client/build/src/api-endpoints";
import type {UpdatePageParameters} from "@notionhq/client/build/src/api-endpoints";

// @ts-ignore
import jsdom from "jsdom";
const { JSDOM } = jsdom;

// Config
const accessToken = process.env.NOTION_ACCESS_TOKEN
const databaseId = process.env.NOTION_DATABASE_ID
if (!accessToken) {
    throw new Error("no databaseId provided")
}
const notionDefaultTimeoutMs = 10 * 1000
const createdAfter = new Date(2000, 1, 1, 0, 0, 0, 0)
const maxItems = 100

const notionClient = new Client({
    auth: accessToken,
    timeoutMs: notionDefaultTimeoutMs,
})

const readRecipe = async (url: string) => {
    const resp = await fetch(url)
    if (!resp.ok) {
        console.warn(`url=${url}, code=${resp.status}`)
        return
    }
    const html = await resp.text();
    const dom = new JSDOM(html);
    const head = dom.window.document.head;
    if (url.includes("marleyspoon.")) {
         return {
             coverUrl: head.querySelector('meta[property~="og:image"]')?.content,
             title: head.querySelector('meta[property~="og:description"]')?.content
         }
    }
    let title = head.querySelector('meta[property~="og:title"]')?.content;
    if (title !== undefined) {
        title = title.split('|')[0].split(' - ')[0].trim()
    }
    return {
        coverUrl: head.querySelector('meta[property~="og:image"]')?.content,
        title: title
    }
}

const updatePage = async (pageId: string, coverUrl?: string, title?: string) => {
    let properties: UpdatePageParameters["properties"] = {
        "Tags": [{name: "auto"}]
    }
    if (title !== undefined) {
        properties["title"] = [{text: {content: title}}]
    }
    let data: UpdatePageParameters = {
        page_id: pageId,
        properties: properties,
    }
    if (coverUrl !== undefined) {
        data.cover = {external: {url: coverUrl}}
    }
    return await notionClient.pages.update(data)
}

const propsMultiSelect = (properties: PageObjectResponse["properties"], name: string) => {
    const prop = properties[name]
    if (prop?.type === "multi_select" && prop.multi_select.length > 0) {
        return prop.multi_select.map((select) => select.name)
    }
    return []
}

export const propsFirstPlainText = (properties: PageObjectResponse["properties"], name: string, type: "rich_text" | "title") => {
    const prop = properties[name]
    if (prop?.type !== type) {
        return null
    }
    // @ts-ignore
    const propType = prop[type]
    if (propType.length > 0) {
        return propType[0].plain_text as string
    }
    return null
}

const propsUrl = (properties: PageObjectResponse["properties"], name: string) => {
    const prop = properties[name]
    if (prop?.type === "url" && prop.url) {
        return prop.url
    }
    return null
}

const processFn = async (page: PageObjectResponse) => {
    const title = propsFirstPlainText(page.properties, "title", "title")
    const url = propsUrl(page.properties, "Webseite")
    const tags = propsMultiSelect(page.properties, "Tags")
    if (url === null || page.cover !== null) {
        return
    }
    //const tags = propsMultiSelect(page.properties, "Tags")
    console.log(`title=${title}, tags=${tags}, url=${url}`)
    const resp = await readRecipe(url)
    if (resp === undefined){
        console.warn("failed")
        return
    }
    console.log(JSON.stringify(resp))
    await updatePage(page.id, resp.coverUrl, resp.title)
}

export const run = async () => {
    let counter = 0
    for await (const item of iteratePaginatedAPI(notionClient.databases.query, {
        database_id: databaseId!,
        page_size: 100,
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
        if (item.object === "page" && isFullPage(item)) {
            await processFn(item)
        }
    }
}
