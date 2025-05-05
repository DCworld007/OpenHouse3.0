"use client";

import { useState, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import PlanCard from "@/components/PlanCard";

const initialCards = [
  { id: "1", type: "what", content: "Card 1" },
  { id: "2", type: "where", content: "Card 2" },
  { id: "3", type: "what", content: "Card 3" },
];

const CARD_TYPE = "CARD";

export default function MinimalReactDndTest() {
  const [cards, setCards] = useState(initialCards);

  const moveCard = (dragIndex: number, hoverIndex: number) => {
    const updated = [...cards];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(hoverIndex, 0, removed);
    setCards(updated);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="max-w-2xl mx-auto py-8">
        <h2 className="text-xl font-bold mb-4">Minimal React DnD Test</h2>
        <div className="flex gap-4">
          {cards.map((card, idx) => (
            <DraggableCard
              key={card.id}
              index={idx}
              id={card.id}
              card={card}
              moveCard={moveCard}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
}

function DraggableCard({ card, index, id, moveCard }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [, drop] = useDrop({
    accept: CARD_TYPE,
    hover(item: any, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });
  const [{ isDragging }, drag] = useDrag({
    type: CARD_TYPE,
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  drag(drop(ref));
  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <PlanCard
        id={card.id}
        what={card.type === "what" ? card.content : ""}
        where={card.type === "where" ? card.content : ""}
        isDragging={isDragging}
      />
    </div>
  );
} 