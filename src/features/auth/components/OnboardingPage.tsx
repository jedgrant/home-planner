import { useState } from 'react'
import { toast } from 'sonner'
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
import { useAuthStore } from '@/shared/lib/authStore'
import { createFamily, joinFamilyWithCode } from '../familyFunctions'
import { signOut } from 'firebase/auth'
import { auth } from '@/shared/lib/firebase'
import { AuthLayout } from './AuthLayout'

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
  const [joining, setJoining] = useState(false)

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
    setJoining(true)
    try {
      const { familyId, role, familyName } = await joinFamilyWithCode(user.uid, values.code)
      setUser({ ...user, familyId, role })
      toast.success(`You've joined ${familyName}!`)
      navigate('/dashboard')
    } catch (err) {
      setJoining(false)
      setServerError(err instanceof Error ? err.message : 'Failed to join family.')
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm space-y-3">
        {/* Main card */}
        <div className="rounded-xl bg-background/85 shadow-lg backdrop-blur-sm md:bg-card md:backdrop-blur-none overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-2xl font-semibold text-foreground">Set up your family</h2>
            <p className="text-sm text-muted-foreground">
              Create a new family or join one with an invite code.
            </p>
          </div>

          {/* Tab toggle */}
          <div className="px-6 pb-4">
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
          </div>

          {/* Form area */}
          <div className="px-6 pb-6 space-y-4">
            {tab === 'create' && (
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateFamily)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="familyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family name</FormLabel>
                        <FormControl>
                          <Input placeholder="The Smiths" {...field} />
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
                    size="xl"
                    className="w-full"
                    disabled={createForm.formState.isSubmitting}
                  >
                    {createForm.formState.isSubmitting ? 'Creating…' : 'Create family'}
                  </Button>
                </form>
              </Form>
            )}

            {tab === 'join' && (
              <Form {...joinForm}>
                <form onSubmit={joinForm.handleSubmit(onJoinFamily)} className="space-y-4">
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
                    size="xl"
                    className="w-full"
                    disabled={joinForm.formState.isSubmitting || joining}
                  >
                    {joining ? 'Verifying your code…' : joinForm.formState.isSubmitting ? 'Joining…' : 'Join family'}
                  </Button>
                </form>
              </Form>
            )}
            {/* Sign out */}
        <p className="text-center text-sm text-muted-foreground">
          Wrong account?{' '}
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="text-primary hover:underline transition-colors"
          >
            Sign out
          </button>
        </p>
          </div>
          
        </div>

        
      </div>
    </AuthLayout>
  )
}
