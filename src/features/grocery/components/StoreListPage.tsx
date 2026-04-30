import { useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Zap,
  ChevronDown,
  ChevronUp,
  History,
  Plus,
  Undo2,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/shared/components/ui/tooltip";
import { useAuthStore } from "@/shared/lib/authStore";
import { useStores } from "../hooks/useStores";
import { useGroceryItems } from "../hooks/useGroceryItems";
import { useGroceryItemMutations } from "../hooks/useGroceryItemMutations";
import { useItemNameHistory } from "../hooks/useItemNameHistory";
import { GroceryItemRow } from "./GroceryItemRow";
import { QuickPickSheet } from "./QuickPickSheet";

export function StoreListPage() {
  const { storeId = "" } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId ?? "";
  const isParent = user?.role === "parent";

  const { data: storeList = [] } = useStores(familyId);
  const store = storeList.find((s) => s.storeId === storeId);

  const { items, isLoading } = useGroceryItems(familyId, storeId);
  const { addItem, editItem, completeItem, uncompleteItem, removeItem } =
    useGroceryItemMutations(familyId);
  const { data: nameHistory = [] } = useItemNameHistory(familyId);

  const [showHistory, setShowHistory] = useState(false);
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const pendingItems = items.filter((i) => !i.completed);
  const completedItems = useMemo(
    () =>
      items
        .filter((i) => i.completed)
        .sort((a, b) => {
          const aMs = a.completedAt?.toMillis() ?? 0;
          const bMs = b.completedAt?.toMillis() ?? 0;
          return bMs - aMs;
        }),
    [items],
  );

  const filteredSuggestions = useMemo(() => {
    if (addName.length < 2) return [];
    const lower = addName.toLowerCase();
    return nameHistory
      .filter((n) => n.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [addName, nameHistory]);

  // Deduplicated recent chips — one per unique name, most recent first
  const recentChips = useMemo(() => {
    const seen = new Set<string>();
    const chips: typeof completedItems = [];
    for (const item of completedItems) {
      const key = item.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        chips.push(item);
      }
      if (chips.length >= 12) break;
    }
    return chips;
  }, [completedItems]);

  if (!familyId) return null;

  async function handleAdd(nameOverride?: string) {
    const name = (nameOverride ?? addName).trim();
    if (!name || !store || !user) return;
    await addItem.mutateAsync({
      name,
      quantity: "1",
      note: "",
      storeId,
      addedBy: user.uid,
    });
    setAddName("");
    setShowSuggestions(false);
    addInputRef.current?.focus();
  }

  function acceptSuggestion(name: string) {
    setAddName(name);
    setShowSuggestions(false);
    handleAdd(name);
  }

  async function handleReAdd(item: (typeof completedItems)[number]) {
    if (!store || !user) return;
    await addItem.mutateAsync({
      name: item.name,
      quantity: item.quantity,
      note: item.note,
      storeId,
      addedBy: user.uid,
    });
  }

  async function handleQuickPickAdd(
    pickedItems: Array<{ name: string; quantity: string; note: string }>,
  ) {
    if (!store || !user) return;
    await Promise.all(
      pickedItems.map((item) =>
        addItem.mutateAsync({ ...item, storeId, addedBy: user.uid }),
      ),
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => navigate("/grocery")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          All grocery lists
        </Button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl flex-1 font-semibold text-foreground truncate">
            {store?.name ?? "Store List"}
          </h1>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickPickOpen(true)}
            >
              <Zap className="mr-1.5 h-4 w-4" />
              <span className="hidden md:block">Quick</span> Pick
            </Button>
          </div>
        </div>
        {store?.notes && (
          <p className="text-xs text-muted-foreground">{store.notes}</p>
        )}
      </div>

      {/* Pending items + inline add */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm">
          {pendingItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing left to buy — great work!
            </p>
          ) : (
            pendingItems.map((item) => (
              <GroceryItemRow
                key={item.itemId}
                item={item}
                isParent={isParent}
                onComplete={() => {
                  if (!store) return;
                  completeItem.mutate({
                    itemId: item.itemId,
                    itemName: item.name,
                    quantity: item.quantity,
                    store,
                    completedBy: user?.uid ?? "",
                  });
                }}
                onUncomplete={() => uncompleteItem.mutate(item.itemId)}
                onEdit={(name, quantity, note) =>
                  editItem.mutateAsync({
                    itemId: item.itemId,
                    name,
                    quantity,
                    note,
                  })
                }
                onRemove={() => removeItem.mutate(item.itemId)}
              />
            ))
          )}

          {/* Inline add input */}
          <div className="relative py-2.5 border-t border-border/40 px-4">
            <div className="flex items-center gap-2">
              <input
                ref={addInputRef}
                value={addName}
                onChange={(e) => {
                  setAddName(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") {
                    setAddName("");
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Add item…"
                className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50 text-foreground"
                aria-label="Add item"
              />
              <button
                onClick={() => handleAdd()}
                disabled={!addName.trim() || addItem.isPending}
                className="shrink-0 text-muted-foreground/40 hover:text-primary disabled:opacity-30 transition-colors"
                aria-label="Add item"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Autocomplete suggestions */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border bg-card shadow-md">
                {filteredSuggestions.map((name) => (
                  <button
                    key={name}
                    onMouseDown={() => acceptSuggestion(name)}
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Recently purchased chips ───────────────────────── */}
      {recentChips.length > 0 && (
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Recently purchased — tap to re-add
          </p>
          <div className="flex flex-wrap gap-2">
            {recentChips.map((item) => (
              <button
                key={item.itemId}
                onClick={() => handleReAdd(item)}
                disabled={addItem.isPending}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                {item.name}
                {item.quantity && item.quantity !== "1" && (
                  <span className="text-xs text-muted-foreground">
                    × {item.quantity}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Purchase history ───────────────────────────────── */}
      {completedItems.length > 0 && (
        <section className="bg-card rounded-xl shadow-sm px-4">
          <button
            type="button"
            className="flex w-full items-center justify-between py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
          >
            <span className="flex items-center gap-1.5">
              <History className="h-4 w-4" />
              Purchase history ({completedItems.length})
            </span>
            {showHistory ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showHistory && (
            <>
              <Separator />
              <div className="py-1">
                {completedItems.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center gap-3 py-2.5 border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{item.name}</p>
                      {item.quantity && item.quantity !== "1" && (
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      )}
                      {item.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          {format(item.completedAt.toDate(), "MMM d, h:mm a")}
                        </p>
                      )}
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                              aria-label={`Undo completion of ${item.name}`}
                              onClick={() => uncompleteItem.mutate(item.itemId)}
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                        <TooltipContent>Move back to list</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.name} from history`}
                      onClick={() => removeItem.mutate(item.itemId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Quick Pick Sheet */}
      {store && (
        <QuickPickSheet
          open={quickPickOpen}
          onOpenChange={setQuickPickOpen}
          familyId={familyId}
          store={store}
          isParent={isParent}
          onAddItems={handleQuickPickAdd}
        />
      )}
    </div>
  );
}
