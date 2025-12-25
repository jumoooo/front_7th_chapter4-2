import {
  DndContext,
  Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { PropsWithChildren } from "react";
import { CellSize, DAY_LABELS } from "./constants.ts";
import { useScheduleContext } from "./ScheduleContext.tsx";

function createSnapModifier(): Modifier {
  return ({ transform, containerNodeRect, draggingNodeRect }) => {
    const containerTop = containerNodeRect?.top ?? 0;
    const containerLeft = containerNodeRect?.left ?? 0;
    const containerBottom = containerNodeRect?.bottom ?? 0;
    const containerRight = containerNodeRect?.right ?? 0;

    const { top = 0, left = 0, bottom = 0, right = 0 } = draggingNodeRect ?? {};

    const minX = containerLeft - left + 120 + 1;
    const minY = containerTop - top + 40 + 1;
    const maxX = containerRight - right;
    const maxY = containerBottom - bottom;

    return {
      ...transform,
      x: Math.min(
        Math.max(
          Math.round(transform.x / CellSize.WIDTH) * CellSize.WIDTH,
          minX
        ),
        maxX
      ),
      y: Math.min(
        Math.max(
          Math.round(transform.y / CellSize.HEIGHT) * CellSize.HEIGHT,
          minY
        ),
        maxY
      ),
    };
  };
}

const modifiers = [createSnapModifier()];

export default function ScheduleDndProvider({ children }: PropsWithChildren) {
  const { setSchedulesMap } = useScheduleContext();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = (event: any) => {
    const { active, delta } = event;
    const { x, y } = delta;
    const [tableId, index] = active.id.split(":");

    // 함수형 업데이트로 최신 상태 보장 및 불필요한 객체 생성 방지
    setSchedulesMap((prev) => {
      const schedule = prev[tableId][Number(index)];
      const nowDayIndex = DAY_LABELS.indexOf(
        schedule.day as (typeof DAY_LABELS)[number]
      );
      const moveDayIndex = Math.floor(x / 80);
      const moveTimeIndex = Math.floor(y / 30);

      return {
        ...prev,
        [tableId]: prev[tableId].map((targetSchedule, targetIndex) => {
          if (targetIndex !== Number(index)) {
            return targetSchedule; // 스프레드 제거 - 불필요한 객체 생성 방지
          }
          return {
            ...targetSchedule,
            day: DAY_LABELS[nowDayIndex + moveDayIndex],
            range: targetSchedule.range.map((time) => time + moveTimeIndex),
          };
        }),
      };
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      modifiers={modifiers}>
      {children}
    </DndContext>
  );
}
