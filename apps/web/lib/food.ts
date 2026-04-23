export interface FoodItem {
  id: number;
  name: string;
  kcal_per_100g: string;
  protein_per_100g: string | null;
  carbs_per_100g: string | null;
  fat_per_100g: string | null;
  source: "open_food_facts" | "manual";
  off_id: string | null;
}

export interface MealDefinitionIngredient {
  id: number;
  food_item_id: number;
  quantity_grams: string;
  food_item_name: string;
  kcal_per_100g: string;
  kcal: string;
}

export interface MealDefinition {
  id: number;
  name: string;
  notes: string | null;
  total_kcal: string;
  ingredients: MealDefinitionIngredient[];
}

export interface MealDefinitionListItem {
  id: number;
  name: string;
  notes: string | null;
  total_kcal: string;
}
