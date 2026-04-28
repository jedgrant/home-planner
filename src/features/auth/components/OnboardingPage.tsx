import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/components/ui/card'
import { useAuthStore } from '@/shared/lib/authStore'
import { createFamily, joinFamilyWithCode } from '../familyFunctions'

type Tab = 'create' | 'join'

const createSchema = z.object({
  familyName: z.string().min(2, 'Family name must be at least 2 characters.').max(60),
})

const joinSchema = z.object({
  code: z
    .string()
    .min(1, 'Invite code is required.')
    .transform((v) => v.trim().toUpperCase()),
})

type CreateValues = z.infer<typeof createSchema>
type JoinValues = z.infer<typeof joinSchema>

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const [tab, setTab] = useState<Tab>('create')
  const [serverError, setServerError] = useState('')

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { familyName: '' },
  })

  const joinForm = useForm<JoinValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: { code: '' },
  })

  async function onCreateFamily(values: CreateValues) {
    if (!user) return
    setServerError('')
    try {
      const familyId = await createFamily(user.uid, values.familyName)
      setUser({ ...user, familyId, role: 'parent' })
      navigate('/chores')
    } catch {
      setServerError('Failed to create family. Please try again.')
    }
  }

  async function onJoinFamily(values: JoinValues) {
    if (!user) return
    setServerError('')
    try {
      await joinFamilyWithCode(user.uid, values.code)
      // AuthProvider will reload the profile on next auth state change,
      // but we do a manual navigate — the guard will re-check once profile reloads.
      navigate('/')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to join family.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Welcome!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your family to get started.
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-lg border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => { setTab('create'); setServerError('') }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'create'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create a family
          </button>
          <button
            type="button"
            onClick={() => { setTab('join'); setServerError('') }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === 'join'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Join with code
          </button>
        </div>

        {tab === 'create' && (
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Create a family</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                You'll be the parent admin and can invite others.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit(onCreateFamily)}
                  className="space-y-4"
                >
                  <FormField
                    control={createForm.control}
                    name="familyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family name</FormLabel>
                        <FormControl>
                          <Input placeholder="The Grants" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {serverError && (
                    <p className="text-xs font-medium text-destructive">{serverError}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createForm.formState.isSubmitting}
                  >
                    {createForm.formState.isSubmitting ? 'Creating…' : 'Create family'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {tab === 'join' && (
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Join a family</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Enter the invite code a family parent shared with you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...joinForm}>
                <form
                  onSubmit={joinForm.handleSubmit(onJoinFamily)}
                  className="space-y-4"
                >
                  <FormField
                    control={joinForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invite code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="HOME-XXXXX"
                            className="font-mono tracking-widest uppercase"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {serverError && (
                    <p className="text-xs font-medium text-destructive">{serverError}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={joinForm.formState.isSubmitting}
                  >
                    {joinForm.formState.isSubmitting ? 'Joining…' : 'Join family'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
