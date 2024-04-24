import {Client, isFullBlock} from "@notionhq/client";
import type {BlockObjectRequest, PageObjectResponse} from "@notionhq/client/build/src/api-endpoints";
import type {UpdatePageParameters} from "@notionhq/client/build/src/api-endpoints";
import {type BrowserContext} from "playwright";
// @ts-ignore
import jsdom from "jsdom";
const { JSDOM } = jsdom;

import {msFetchRecipe} from "./ms";
import {Recipe} from "./types";
import {propsFirstPlainText, propsUrl, richTexts} from "./notion-util";

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

const createPageParams = (pageId: string, coverUrl?: string, title?: string, subtitle?: string): UpdatePageParameters => {
    let properties: UpdatePageParameters["properties"] = {}
    if (title !== undefined) {
        properties["title"] = [{text: {content: title}}]
    }
    if (subtitle !== undefined) {
        properties["Kurzbeschreibung"] = [{text: {content: subtitle}}]
    }
    let data: UpdatePageParameters = {
        page_id: pageId,
        properties: Object.keys(properties).length > 0 ? properties : undefined,
    }
    if (coverUrl !== undefined) {
        data.cover = {external: {url: coverUrl}}
    }
    return data
}

const createBlocks = (recipe: Recipe): Array<BlockObjectRequest> => {
    const blocks: Array<BlockObjectRequest> = [
        {
            type: "heading_2",
            heading_2: {
                rich_text: richTexts("Zutaten")
            }
        },
        {
            type: "paragraph",
            paragraph: {
                rich_text: richTexts("2 Personen:")
            }
        }
    ]
    recipe.ingredients.forEach(ingredient => {
        blocks.push({
            type: "bulleted_list_item",
            bulleted_list_item: {
                rich_text: richTexts(ingredient)
            }
        })
    })
    if (recipe.homeIngredients.length > 0) {
        blocks.push({
            type: "bulleted_list_item",
            bulleted_list_item: {
                rich_text: richTexts(`(${recipe.homeIngredients.join(", ")})`)
            }
        })
    }
    blocks.push({
        type: "heading_2",
        heading_2: {
            rich_text: richTexts("Zubereitung")
        }
    })
    recipe.steps.forEach((step) => {
        blocks.push({
            type: "heading_3",
            heading_3: {
                rich_text: richTexts(step.title)
            }
        })
        blocks.push(        {
            type: "paragraph",
            paragraph: {
                rich_text: richTexts(step.description)
            }
        })
    })
    return blocks
}

export const processFn = async (client: Client, context: BrowserContext, page: PageObjectResponse) => {
    const url = propsUrl(page.properties, "Webseite")
    if (url === null) {
        return
    }
    const title = propsFirstPlainText(page.properties, "title", "title")
    const subtitle = propsFirstPlainText(page.properties, "Kurzbeschreibung", "rich_text")
    // const tags = propsMultiSelect(page.properties, "Tags")

    // 1) If page misses a title or cover try to add it
    if (title === null || page.cover === null) {
        console.log(`title=${title}, url=${url}`)

        const baseData = await readRecipe(url)
        if (baseData === undefined){
            console.warn("failed")
            return
        }
        console.log(JSON.stringify(baseData))
        // Keep always the original value (e.g. don't overwrite the title)
        await client.pages.update(createPageParams(page.id, page.cover !== null ? undefined : baseData.coverUrl, title !== null ? undefined : baseData.title))
    }

    if (url.includes("marleyspoon.")) {
        const pageBlock = await client.blocks.retrieve({block_id: page.id})
        // 2) If page misses a page content try to add it
        if (isFullBlock(pageBlock) && !pageBlock.has_children) {
            const contentData = await msFetchRecipe(context, url)
            // console.log(JSON.stringify(contentData))
            await client.blocks.children.append({block_id: page.id, children: createBlocks(contentData)})
            if (subtitle === null && contentData.subtitle !== null) {
                await client.pages.update(createPageParams(page.id, undefined, undefined, contentData.subtitle))
            }
        }
    }
}
