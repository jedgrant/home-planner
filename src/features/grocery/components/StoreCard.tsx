import { useRef, useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { AddEditStoreDialog } from "./AddEditStoreDialog";
import { CardGroceryItemRow } from "./CardGroceryItemRow";
import { useGroceryItemMutations } from "../hooks/useGroceryItemMutations";
import { useAuthStore } from "@/shared/lib/authStore";
import { cn } from "@/shared/lib/utils";
import type { Store, GroceryItem } from "@/shared/types/grocery";

interface StoreCardProps {
  store: Store;
  items: GroceryItem[];
  isParent: boolean;
  onEdit: (name: string, notes: string) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function StoreCard({
  store,
  items,
  isParent,
  onEdit,
  onRemove,
}: StoreCardProps) {
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId ?? "";
  const { addItem, editItem, completeItem, removeItem } =
    useGroceryItemMutations(familyId);

  const { setNodeRef, isOver } = useDroppable({ id: store.storeId });

  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  async function handleAdd() {
    const name = addName.trim();
    if (!name || !user) return;
    await addItem.mutateAsync({
      name,
      quantity: "1",
      note: "",
      storeId: store.storeId,
      addedBy: user.uid,
    });
    setAddName("");
    addInputRef.current?.focus();
  }

  return (
    <>
      <Card
        className={cn(
          "rounded-xl flex flex-col transition-all pt-2.5",
          isOver && "ring-2 ring-primary/40 shadow-md",
        )}
      >
        {/* Header */}
        <CardHeader className="">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CardTitle className="text-base font-bold truncate">
                {store.name}
              </CardTitle>
              {items.length > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-full text-xs tabular-nums shrink-0"
                >
                  {items.length}
                </Badge>
              )}
            </div>
            {isParent && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors shrink-0"
                  aria-label="Store options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setRemoveOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {store.notes && (
            <p className="text-xs text-muted-foreground">{store.notes}</p>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col py-0">
          {/* Droppable + sortable item list */}
          <div ref={setNodeRef} className="min-h-8">
            <SortableContext
              items={items.map((i) => i.itemId)}
              strategy={verticalListSortingStrategy}
            >
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center italic">
                  No items yet — add one below
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto -mr-1 pr-1">
                  {items.map((item) => (
                    <CardGroceryItemRow
                      key={item.itemId}
                      item={item}
                      onComplete={() => {
                        if (!user) return;
                        completeItem.mutate({
                          itemId: item.itemId,
                          itemName: item.name,
                          quantity: item.quantity,
                          store,
                          completedBy: user.uid,
                        });
                      }}
                      onEdit={(name, qty, note) =>
                        editItem.mutateAsync({
                          itemId: item.itemId,
                          name,
                          quantity: qty,
                          note,
                        })
                      }
                      onRemove={() => removeItem.mutate(item.itemId)}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
          </div>

          
        </CardContent>
        <CardFooter>
          <Input
            ref={addInputRef}
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="Add item…"
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!addName.trim() || addItem.isPending}
            className="h-8 px-3 shrink-0"
            aria-label="Add item"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <AddEditStoreDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={onEdit}
        store={store}
      />

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {store.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The store will be archived. All items and history are kept but
              this store won't appear as an active option.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
