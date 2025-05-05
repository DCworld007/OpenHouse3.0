"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PlanCard from "@/components/PlanCard";

const initialCards = [
  { id: "1", type: "what", content: "Card 1" },
  { id: "2", type: "where", content: "Card 2" },
  { id: "3", type: "what", content: "Card 3" },
];

export default function MinimalDnDTest() {
  const [cards, setCards] = useState(initialCards);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setCards(arrayMove(cards, oldIndex, newIndex));
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-xl font-bold mb-4">Minimal DnD Kit Test</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-4">
            {cards.map((card) => (
              <SortableCard key={card.id} card={card} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableCard({ card }: { card: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PlanCard
        id={card.id}
        what={card.type === "what" ? card.content : ""}
        where={card.type === "where" ? card.content : ""}
        isDragging={isDragging}
      />
    </div>
  );
} 