import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUp, Paperclip, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useCreateRecipe } from "../hooks/useRecipes";
import { useParseRecipeFromContent } from "../hooks/useRecipeAI";
import { useAuthStore } from "@/shared/lib/authStore";
import { nanoid } from "nanoid";
import type { CourseType } from "@/shared/types/recipes";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  courseType: z.enum(["entree", "side", "salad", "fruit", "dessert"]),
  servingSize: z.number().int().positive().optional(),
});

type FormValues = z.infer<typeof schema>;

const COURSE_ITEMS: { value: CourseType; label: string }[] = [
  { value: "entree", label: "Entrée" },
  { value: "side", label: "Side" },
  { value: "salad", label: "Salad" },
  { value: "fruit", label: "Fruit" },
  { value: "dessert", label: "Dessert" },
];

export interface CreateRecipeSheetProps {
  open: boolean;
  onClose: () => void;
  familyId: string;
  onCreated: (recipeId: string) => void;
}

export function CreateRecipeSheet({
  open,
  onClose,
  familyId,
  onCreated,
}: CreateRecipeSheetProps) {
  const user = useAuthStore((s) => s.user);
  const createMutation = useCreateRecipe(familyId);
  const parseMutation = useParseRecipeFromContent();
  const fileRef = useRef<HTMLInputElement>(null);

  const [importText, setImportText] = useState("");
  const [importImage, setImportImage] = useState<{
    base64: string;
    mediaType: string;
  } | null>(null);
  const [imageName, setImageName] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", courseType: "entree", servingSize: undefined },
  });

  function handleClose() {
    form.reset();
    setImportText("");
    setImportImage(null);
    setImageName("");
    parseMutation.reset();
    onClose();
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const [header, base64] = dataUrl.split(",");
      const mediaType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
      setImportImage({ base64, mediaType });
    };
    reader.readAsDataURL(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const imageItem = Array.from(e.clipboardData.items).find((item) =>
      item.type.startsWith("image/"),
    );
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    setImageName(file.name || "pasted-image.png");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const [header, base64] = dataUrl.split(",");
      const mediaType = header.match(/data:([^;]+)/)?.[1] ?? "image/png";
      setImportImage({ base64, mediaType });
    };
    reader.readAsDataURL(file);
  }

  async function handleParse() {
    const result = await parseMutation.mutateAsync({
      text: importText.trim() || undefined,
      imageBase64: importImage?.base64,
      imageMediaType: importImage?.mediaType,
    });
    form.reset({
      name: result.name,
      courseType: result.courseType,
      servingSize: result.servingSize || undefined,
    });
  }

  async function onSubmit(values: FormValues) {
    const parsed = parseMutation.data;
    const ingredients =
      parsed?.ingredients.map((ing) => ({
        ingredientId: nanoid(),
        name: ing.name,
        quantity: ing.quantity,
        unit: null,
        storeId: null,
        storeName: null,
      })) ?? [];
    const prepTasks =
      parsed?.prepTasks.map((t, i) => ({
        taskId: nanoid(),
        description: t.description,
        difficulty: t.difficulty,
        order: t.order ?? i,
      })) ?? [];
    const id = await createMutation.mutateAsync({
      familyId,
      name: values.name,
      courseType: values.courseType,
      description: parsed?.description ?? "",
      servingSize: values.servingSize ?? 0,
      visibility: "private",
      sourceGlobalRecipeId: null,
      ingredients,
      prepTasks,
      archived: false,
      createdBy: user?.uid ?? "",
    });
    handleClose();
    onCreated(id);
  }

  const canParse =
    (importText.trim().length > 0 || importImage !== null) &&
    !parseMutation.isPending;
  const hasParsed = parseMutation.isSuccess;

  function CourseAndServesFields() {
    return (
      <div className="flex gap-3">
        <FormField
          control={form.control}
          name="courseType"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Dish to prepare</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COURSE_ITEMS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="servingSize"
          render={({ field }) => (
            <FormItem className="w-28">
              <FormLabel>Serves</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="4"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? e.target.valueAsNumber : undefined,
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="border-b border-b-olive-400/70">
          <SheetTitle>New Recipe</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <Tabs defaultValue="manual">
            <TabsList className="w-full">
              <TabsTrigger value="manual" className="flex-1">
                Create from scratch
              </TabsTrigger>
              <TabsTrigger value="import" className="flex-1">
                Import with AI
              </TabsTrigger>
            </TabsList>

            {/* ── Name it tab ── */}
            <TabsContent value="manual" className="mt-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipe Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Chicken Alfredo"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <CourseAndServesFields />
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="flex-1"
                    >
                      {createMutation.isPending ? "Creating…" : "Create Recipe"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* ── Import with AI tab ── */}
            <TabsContent value="import" className="mt-6 space-y-4">
              {!hasParsed ? (
                <>
                  {/* Prompt-style input */}
                  <div
                    className="rounded-2xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring transition-shadow"
                    onPaste={handlePaste}
                  >
                    <Textarea
                      placeholder="Paste a recipe image or text, describe a dish, or drop in files to get started"
                      className="min-h-[120px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 p-4 text-sm"
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    />

                    {/* Attached image chip */}
                    {importImage && (
                      <div className="px-4 pb-3">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                          <span className="max-w-[180px] truncate">{imageName}</span>
                          <button
                            type="button"
                            onClick={() => { setImportImage(null); setImageName(""); }}
                            className="ml-0.5 rounded-full hover:text-destructive transition-colors"
                            aria-label="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-3 pb-3">
                      <div className="flex items-center gap-1">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          aria-label="Attach image"
                        >
                          <span className="text-lg leading-none">+</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={!canParse}
                        onClick={handleParse}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-opacity"
                        aria-label="Parse with AI"
                      >
                        {parseMutation.isPending ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {parseMutation.isError && (
                    <p className="text-sm text-destructive">
                      Parsing failed. Check your content and try again.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    You can paste text, attach a photo, or do both.
                  </p>
                </>
              ) : (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <p className="text-sm text-muted-foreground">
                      AI extracted the following. Review and edit before saving.
                    </p>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipe Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <CourseAndServesFields />
                    {parseMutation.data && (
                      <p className="text-sm text-muted-foreground rounded-lg bg-muted p-3">
                        {parseMutation.data.ingredients.length} ingredients and{" "}
                        {parseMutation.data.prepTasks.length} prep tasks
                        extracted — fully editable on the recipe page.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          parseMutation.reset();
                          setImportText("");
                          setImportImage(null);
                          setImageName("");
                          form.reset();
                        }}
                      >
                        Start over
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="flex-1"
                      >
                        {createMutation.isPending
                          ? "Creating…"
                          : "Create Recipe"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
