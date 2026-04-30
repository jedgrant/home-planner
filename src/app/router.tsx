import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'
import { FamilyGuard } from './FamilyGuard'
import { AppShell } from './AppShell'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { RegisterPage } from '@/features/auth/components/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/components/ResetPasswordPage'
import { OnboardingPage } from '@/features/auth/components/OnboardingPage'
import { ClaimProfilePage } from '@/features/auth/components/ClaimProfilePage'
import { ChoresPage } from '@/features/chores/components/ChoresPage'
import { ChoreManagePage } from '@/features/chores/components/ChoreManagePage'
import { GroceryPage } from '@/features/grocery/components/GroceryPage'
import { StoreListPage } from '@/features/grocery/components/StoreListPage'
import { MealsPage } from '@/features/meals/components/MealsPage'
import { RecipeBookPage } from '@/features/meals/components/RecipeBookPage'
import { RecipeDetailPage } from '@/features/meals/components/RecipeDetailPage'
import { MealDetailPage } from '@/features/meals/components/MealDetailPage'
import { ProfilePage } from '@/features/profiles/components/ProfilePage'
import { SectionErrorBoundary } from './SectionErrorBoundary'
import { HomePage } from './pages/HomePage'
import { DashboardPage } from './pages/DashboardPage'
import { ChildDashboardPage } from './pages/ChildDashboardPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
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
      { path: '/claim-profile', element: <ClaimProfilePage /> },
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
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/child-dashboard', element: <ChildDashboardPage /> },
              {
                path: '/chores',
                element: (
                  <SectionErrorBoundary resetKey="/chores">
                    <ChoresPage />
                  </SectionErrorBoundary>
                ),
              },
              {
                path: '/chores/manage',
                element: (
                  <SectionErrorBoundary resetKey="/chores/manage">
                    <ChoreManagePage />
                  </SectionErrorBoundary>
                ),
              },
              {
                path: '/grocery',
                element: (
                  <SectionErrorBoundary resetKey="/grocery">
                    <GroceryPage />
                  </SectionErrorBoundary>
                ),
              },
              {
                path: '/grocery/:storeId',
                element: (
                  <SectionErrorBoundary resetKey="/grocery/:storeId">
                    <StoreListPage />
                  </SectionErrorBoundary>
                ),
              },
              {
                path: '/meals',
                element: (
                  <SectionErrorBoundary resetKey="/meals">
                    <MealsPage />
                  </SectionErrorBoundary>
                ),
              },
              {
                path: '/meals/recipes',
                element: <Navigate to="/recipes" replace />,
              },
              {
                path: '/meals/recipes/:id',
                element: <Navigate to="/recipes" replace />,
              },
              {
                path: '/recipes',
                element: (
                  <SectionErrorBoundary resetKey="/recipes">
                    <RecipeBookPage />
                  </SectionErrorBoundary>
                ),
              },
              {
                path: '/recipes/:id',
                element: (
                  <SectionErrorBoundary resetKey="/recipes/:id">
                    <RecipeDetailPage />
                  </SectionErrorBoundary>
                ),
              },
              {
                path: '/meals/:mealId',
                element: (
                  <SectionErrorBoundary resetKey="/meals/:mealId">
                    <MealDetailPage />
                  </SectionErrorBoundary>
                ),
              },
              { path: '/profile/:userId', element: (
                  <SectionErrorBoundary resetKey="/profile/:userId">
                    <ProfilePage />
                  </SectionErrorBoundary>
                ),
              },
              { path: '/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
])
