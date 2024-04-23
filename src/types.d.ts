export type RecipeStep = {
    title: string
    description: string
}

export type Recipe = {
    subtitle: string | null
    ingredients: Array<string>,
    homeIngredients: Array<string>
    steps: Array<RecipeStep>,
}
