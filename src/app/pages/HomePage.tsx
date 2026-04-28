import { Link } from 'react-router-dom'
import choresPng from '@/assets/chores.png'
import groceriesPng from '@/assets/groceries.png'
import mealsPng from '@/assets/meals.png'
import recipesPng from '@/assets/recipes.png'

const tiles = [
  { label: 'Chores', to: '/chores', img: choresPng },
  { label: 'Grocery', to: '/grocery', img: groceriesPng },
  { label: 'Meals', to: '/meals', img: mealsPng },
  { label: 'Recipes', to: '/meals/recipes', img: recipesPng },
]

export function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8 gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-semibold text-primary tracking-tight">Haven</h1>
        <p className="text-muted-foreground text-sm">What would you like to do today?</p>
      </div>

      <div className="grid grid-cols-2 gap-5 w-full max-w-xl">
        {tiles.map(({ label, to, img }) => (
          <Link
            key={to}
            to={to}
            className="group relative flex flex-col items-center rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
          >
            <div className="w-full aspect-4/3 overflow-hidden bg-muted">
              <img
                src={img}
                alt={label}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="py-3 px-4 w-full">
              <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
