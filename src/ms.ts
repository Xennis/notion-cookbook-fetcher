// Requires: `npx playwright install` too
import playwright from "playwright";
import {Recipe, RecipeStep} from "./types";


export const msFetchRecipe = async (url: string, timeoutMs: number = 1000): Promise<Recipe> => {
    const browser = await playwright['chromium'].launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(url)
    await page.waitForTimeout(timeoutMs)
    const [steps, ingredients, homeIngredients, subtitle] = await Promise.all([
        page.$$eval('.dish-step', nodes => nodes.map((node) => {
            let title = node.querySelector('.dish-step__body-heading')?.textContent
            if (title) {
                title = title.replace(/(\n)/gm, "").trim()
            }
            const description = node.querySelector('.dish-step__body-text')?.textContent
            return { title, description }
        })),
        page.$$eval('.dish-detail__ingredient', nodes => nodes.map((node) => {
            let content = node.textContent;
            if (content) {
                content = content.replace(/(\n)/gm, "").trim()
            }
            return content
        })),
        page.$$eval('.dish-detail__sidebar-section:first-child li', nodes => nodes.map((node) => {
            return node.textContent;
        })),
        page.$$eval('.recipe-subtitle', nodes => nodes.map((node) => {
            return node.textContent;
        })),
    ])
    await browser.close()
    return {
        subtitle: subtitle.length > 0 ? subtitle[0] : null,
        ingredients: ingredients.filter((i) => i !== null) as Array<string>,
        homeIngredients: homeIngredients.filter((i) => i !== null) as Array<string>,
        steps: steps.filter((i) => i.title && i.description) as Array<RecipeStep>
    }
}
