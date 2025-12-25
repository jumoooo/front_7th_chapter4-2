import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Text,
} from "@chakra-ui/react";
import { CellSize, DAY_LABELS, 분 } from "./constants.ts";
import { Schedule } from "./types.ts";
import { fill2, parseHnM } from "./utils.ts";
import { useDndContext, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ComponentProps, Fragment, memo, useMemo } from "react";

interface Props {
  tableId: string;
  schedules: Schedule[];
  onScheduleTimeClick?: (timeInfo: { day: string, time: number }) => void;
  onDeleteButtonClick?: (timeInfo: { day: string, time: number }) => void;
}

const TIMES = [
  ...Array(18)
    .fill(0)
    .map((v, k) => v + k * 30 * 분)
    .map((v) => `${parseHnM(v)}~${parseHnM(v + 30 * 분)}`),

  ...Array(6)
    .fill(18 * 30 * 분)
    .map((v, k) => v + k * 55 * 분)
    .map((v) => `${parseHnM(v)}~${parseHnM(v + 50 * 분)}`),
] as const;

// ScheduleTable 컴포넌트 메모이제이션 - 드래그 중 불필요한 리렌더링 방지
const ScheduleTable = memo(({ tableId, schedules, onScheduleTimeClick, onDeleteButtonClick }: Props) => {

  // 색상 맵 메모이제이션 - 한 번만 계산하고 재사용
  const colorMap = useMemo(() => {
    const lectures = [...new Set(schedules.map(({ lecture }) => lecture.id))];
    const colors = ["#fdd", "#ffd", "#dff", "#ddf", "#fdf", "#dfd"];
    const map = new Map<string, string>();
    lectures.forEach((lectureId, index) => {
      map.set(lectureId, colors[index % colors.length]);
    });
    return map;
  }, [schedules]);

  const getColor = (lectureId: string): string => {
    return colorMap.get(lectureId) || "#fdd";
  };

  const dndContext = useDndContext();

  // activeTableId 메모이제이션 - dndContext.active?.id가 변경될 때만 재계산
  // 드래그 중에는 activeId만 변경되므로, 이 값만 추적하여 불필요한 재계산 방지
  const activeTableId = useMemo(() => {
    const activeId = dndContext.active?.id;
    if (activeId) {
      return String(activeId).split(":")[0];
    }
    return null;
  }, [dndContext.active?.id]);

  return (
    <Box
      position="relative"
      outline={activeTableId === tableId ? "5px dashed" : undefined}
      outlineColor="blue.300"
    >
      <Grid
        templateColumns={`120px repeat(${DAY_LABELS.length}, ${CellSize.WIDTH}px)`}
        templateRows={`40px repeat(${TIMES.length}, ${CellSize.HEIGHT}px)`}
        bg="white"
        fontSize="sm"
        textAlign="center"
        outline="1px solid"
        outlineColor="gray.300"
      >
        <GridItem key="교시" borderColor="gray.300" bg="gray.100">
          <Flex justifyContent="center" alignItems="center" h="full" w="full">
            <Text fontWeight="bold">교시</Text>
          </Flex>
        </GridItem>
        {DAY_LABELS.map((day) => (
          <GridItem key={day} borderLeft="1px" borderColor="gray.300" bg="gray.100">
            <Flex justifyContent="center" alignItems="center" h="full">
              <Text fontWeight="bold">{day}</Text>
            </Flex>
          </GridItem>
        ))}
        {TIMES.map((time, timeIndex) => (
          <Fragment key={`시간-${timeIndex + 1}`}>
            <GridItem
              borderTop="1px solid"
              borderColor="gray.300"
              bg={timeIndex > 17 ? 'gray.200' : 'gray.100'}
            >
              <Flex justifyContent="center" alignItems="center" h="full">
                <Text fontSize="xs">{fill2(timeIndex + 1)} ({time})</Text>
              </Flex>
            </GridItem>
            {DAY_LABELS.map((day) => (
              <GridItem
                key={`${day}-${timeIndex + 2}`}
                borderWidth="1px 0 0 1px"
                borderColor="gray.300"
                bg={timeIndex > 17 ? 'gray.100' : 'white'}
                cursor="pointer"
                _hover={{ bg: 'yellow.100' }}
                onClick={() => onScheduleTimeClick?.({ day, time: timeIndex + 1 })}
              />
            ))}
          </Fragment>
        ))}
      </Grid>

      {schedules.map((schedule, index) => (
        <DraggableSchedule
          key={`${tableId}:${index}`}
          id={`${tableId}:${index}`}
          data={schedule}
          bg={getColor(schedule.lecture.id)}
          onDeleteButtonClick={() => onDeleteButtonClick?.({
            day: schedule.day,
            time: schedule.range[0],
          })}
        />
      ))}
    </Box>
  );
}, (prevProps, nextProps) => {
  // 커스텀 비교 함수 - schedules 배열 참조와 tableId만 비교
  // onScheduleTimeClick, onDeleteButtonClick은 함수이므로 참조 비교
  // 드래그 중에는 schedules와 tableId가 변경되지 않으므로 리렌더링 방지
  return (
    prevProps.tableId === nextProps.tableId &&
    prevProps.schedules === nextProps.schedules &&
    prevProps.onScheduleTimeClick === nextProps.onScheduleTimeClick &&
    prevProps.onDeleteButtonClick === nextProps.onDeleteButtonClick
  );
});

// DraggableSchedule 컴포넌트 메모이제이션 - 드래그 중 불필요한 리렌더링 방지
const DraggableSchedule = memo(({
 id,
 data,
 bg,
 onDeleteButtonClick
}: { id: string; data: Schedule } & ComponentProps<typeof Box> & {
  onDeleteButtonClick: () => void
}) => {
  const { day, range, room, lecture } = data;
  const { attributes, setNodeRef, listeners, transform } = useDraggable({ id });
  const leftIndex = DAY_LABELS.indexOf(day as typeof DAY_LABELS[number]);
  const topIndex = range[0] - 1;
  const size = range.length;

  return (
    <Popover>
      <PopoverTrigger>
        <Box
          position="absolute"
          left={`${120 + (CellSize.WIDTH * leftIndex) + 1}px`}
          top={`${40 + (topIndex * CellSize.HEIGHT + 1)}px`}
          width={(CellSize.WIDTH - 1) + "px"}
          height={(CellSize.HEIGHT * size - 1) + "px"}
          bg={bg}
          p={1}
          boxSizing="border-box"
          cursor="pointer"
          ref={setNodeRef}
          transform={CSS.Translate.toString(transform)}
          {...listeners}
          {...attributes}
        >
          <Text fontSize="sm" fontWeight="bold">{lecture.title}</Text>
          <Text fontSize="xs">{room}</Text>
        </Box>
      </PopoverTrigger>
      <PopoverContent onClick={event => event.stopPropagation()}>
        <PopoverArrow/>
        <PopoverCloseButton/>
        <PopoverBody>
          <Text>강의를 삭제하시겠습니까?</Text>
          <Button colorScheme="red" size="xs" onClick={onDeleteButtonClick}>
            삭제
          </Button>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}, (prevProps, nextProps) => {
  // 커스텀 비교 함수 - id, data, bg만 비교 (onDeleteButtonClick은 무시)
  // 드래그 중에는 id, data, bg가 변경되지 않으므로 리렌더링 방지
  return (
    prevProps.id === nextProps.id &&
    prevProps.data === nextProps.data &&
    prevProps.bg === nextProps.bg
  );
});

export default ScheduleTable;
