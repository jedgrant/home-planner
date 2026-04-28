import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'
import { FamilyGuard } from './FamilyGuard'
import { AppShell } from './AppShell'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { RegisterPage } from '@/features/auth/components/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/components/ResetPasswordPage'
import { OnboardingPage } from '@/features/auth/components/OnboardingPage'
import { ChoresPage } from '@/features/chores/components/ChoresPage'
import { ChoreManagePage } from '@/features/chores/components/ChoreManagePage'
import { GroceryPage } from '@/features/grocery/components/GroceryPage'
import { StoreListPage } from '@/features/grocery/components/StoreListPage'
import { MealsPage } from '@/features/meals/components/MealsPage'
import { RecipeBookPage } from '@/features/meals/components/RecipeBookPage'
import { RecipeDetailPage } from '@/features/meals/components/RecipeDetailPage'
import { MealDetailPage } from '@/features/meals/components/MealDetailPage'
import { ProfilePage } from '@/features/profiles/components/ProfilePage'
import { HomePage } from './pages/HomePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/home" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  // Auth required, family NOT required
  {
    element: <AuthGuard />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
    ],
  },
  // Auth + family required — full app shell
  {
    element: <AuthGuard />,
    children: [
      {
        element: <FamilyGuard />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/home', element: <HomePage /> },
              { path: '/chores', element: <ChoresPage /> },
              { path: '/chores/manage', element: <ChoreManagePage /> },
              { path: '/grocery', element: <GroceryPage /> },
              { path: '/grocery/:storeId', element: <StoreListPage /> },
              { path: '/meals', element: <MealsPage /> },
              { path: '/meals/recipes', element: <RecipeBookPage /> },
              { path: '/meals/recipes/:id', element: <RecipeDetailPage /> },
              { path: '/meals/:mealId', element: <MealDetailPage /> },
              { path: '/profile/:userId', element: <ProfilePage /> },
              { path: '/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
])
