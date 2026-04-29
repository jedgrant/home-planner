import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { RecipeCard } from './RecipeCard'
import { CreateRecipeSheet } from './CreateRecipeSheet'
import {
  useRecipes,
  useGlobalRecipes,
  useForkGlobalRecipe,
} from '../hooks/useRecipes'
import { useAuthStore } from '@/shared/lib/authStore'
import type { CourseType } from '@/shared/types/recipes'

const COURSE_OPTIONS: { value: CourseType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Courses' },
  { value: 'entree', label: 'Entrées' },
  { value: 'side', label: 'Sides' },
  { value: 'salad', label: 'Salads' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'dessert', label: 'Desserts' },
]

export function RecipeBookPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'

  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState<CourseType | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)

  const { data: familyRecipes = [], isLoading: loadingFamily } =
    useRecipes(familyId)
  const { data: globalRecipes = [], isLoading: loadingGlobal } =
    useGlobalRecipes()
  const forkMutation = useForkGlobalRecipe(familyId)

  function filterList<T extends { name: string; courseType: CourseType }>(
    list: T[]
  ) {
    return list.filter((r) => {
      const matchSearch = r.name.toLowerCase().includes(search.toLowerCase())
      const matchCourse =
        courseFilter === 'all' || r.courseType === courseFilter
      return matchSearch && matchCourse
    })
  }

  const filtered = filterList(familyRecipes)
  const filteredGlobal = filterList(globalRecipes)

  const skeletons = Array.from({ length: 6 }, (_, i) => (
    <Skeleton key={i} className="h-32 rounded-xl" />
  ))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Recipe Book</h1>
          <p className="text-sm text-muted-foreground">
            {familyRecipes.length} family recipe
            {familyRecipes.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isParent && (
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Recipe
          </Button>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={courseFilter}
          onValueChange={(v) => setCourseFilter(v as CourseType | 'all')}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COURSE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="family" className="mt-6">
        <TabsList>
          <TabsTrigger value="family">Our Recipes</TabsTrigger>
          <TabsTrigger value="global">Global Library</TabsTrigger>
        </TabsList>

        <TabsContent value="family" className="mt-4">
          {loadingFamily ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{skeletons}</div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {search || courseFilter !== 'all'
                ? 'No recipes match your filters.'
                : 'No recipes yet. Create your first one!'}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => (
                <RecipeCard
                  key={r.recipeId}
                  recipe={r}
                  onClick={() => navigate(`/meals/recipes/${r.recipeId}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="global" className="mt-4">
          {loadingGlobal ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{skeletons}</div>
          ) : filteredGlobal.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {search || courseFilter !== 'all'
                ? 'No recipes match your filters.'
                : 'The global library is empty.'}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGlobal.map((r) => (
                <RecipeCard
                  key={r.recipeId}
                  recipe={r}
                  onClick={() =>
                    navigate(`/meals/recipes/${r.recipeId}?source=global`)
                  }
                  onFork={
                    isParent ? () => forkMutation.mutate(r) : undefined
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {isParent && (
        <CreateRecipeSheet
          open={showCreate}
          onClose={() => setShowCreate(false)}
          familyId={familyId}
          onCreated={(id) => navigate(`/meals/recipes/${id}`)}
        />
      )}
    </div>
  )
}
