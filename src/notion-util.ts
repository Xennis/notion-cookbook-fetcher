import type {PageObjectResponse} from "@notionhq/client/build/src/api-endpoints";

export const richTexts = (content: string) => {
    return [{text: {content: content}}]
}

// export const propsMultiSelect = (properties: PageObjectResponse["properties"], name: string) => {
//     const prop = properties[name]
//     if (prop?.type === "multi_select" && prop.multi_select.length > 0) {
//         return prop.multi_select.map((select) => select.name)
//     }
//     return []
// }

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

export const propsUrl = (properties: PageObjectResponse["properties"], name: string) => {
    const prop = properties[name]
    if (prop?.type === "url" && prop.url) {
        return prop.url
    }
    return null
}
