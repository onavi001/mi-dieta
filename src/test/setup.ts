import fixture from './fixtures/ingredientReference.json'
import type { IngredientReferencePayload } from '../data/reference/ingredientReference'
import { hydrateIngredientReference } from '../data/reference/ingredientReference'

hydrateIngredientReference(fixture as IngredientReferencePayload)
