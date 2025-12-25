import { Button, ButtonGroup, Flex, Heading, Stack } from "@chakra-ui/react";
import ScheduleTable from "./ScheduleTable.tsx";
import { useScheduleContext } from "./ScheduleContext.tsx";
import SearchDialog from "./SearchDialog.tsx";
import { useCallback, useMemo, useState } from "react";

export const ScheduleTables = () => {
  const { schedulesMap, setSchedulesMap } = useScheduleContext();
  const [searchInfo, setSearchInfo] = useState<{
    tableId: string;
    day?: string;
    time?: number;
  } | null>(null);

  // disabledRemoveButton 메모이제이션 - 불필요한 재계산 방지
  const disabledRemoveButton = useMemo(
    () => Object.keys(schedulesMap).length === 1,
    [schedulesMap]
  );

  const duplicate = (targetId: string) => {
    setSchedulesMap(prev => ({
      ...prev,
      [`schedule-${Date.now()}`]: [...prev[targetId]]
    }))
  };

  const remove = (targetId: string) => {
    setSchedulesMap(prev => {
      delete prev[targetId];
      return { ...prev };
    })
  };

  // 각 tableId마다 onScheduleTimeClick, onDeleteButtonClick 함수를 메모이제이션
  // 드래그 중 불필요한 리렌더링 방지
  const handlersMap = useMemo(() => {
    const map = new Map<string, {
      onScheduleTimeClick: (timeInfo: { day: string, time: number }) => void;
      onDeleteButtonClick: ({ day, time }: { day: string, time: number }) => void;
    }>();
    
    Object.keys(schedulesMap).forEach(tableId => {
      map.set(tableId, {
        onScheduleTimeClick: (timeInfo: { day: string, time: number }) => {
          setSearchInfo({ tableId, ...timeInfo });
        },
        onDeleteButtonClick: ({ day, time }: { day: string, time: number }) => {
          setSchedulesMap((prev) => ({
            ...prev,
            [tableId]: prev[tableId].filter(schedule => schedule.day !== day || !schedule.range.includes(time))
          }));
        }
      });
    });
    
    return map;
  }, [schedulesMap, setSchedulesMap]);

  return (
    <>
      <Flex w="full" gap={6} p={6} flexWrap="wrap">
        {Object.entries(schedulesMap).map(([tableId, schedules], index) => (
          <Stack key={tableId} width="600px">
            <Flex justifyContent="space-between" alignItems="center">
              <Heading as="h3" fontSize="lg">시간표 {index + 1}</Heading>
              <ButtonGroup size="sm" isAttached>
                <Button colorScheme="green" onClick={() => setSearchInfo({ tableId })}>시간표 추가</Button>
                <Button colorScheme="green" mx="1px" onClick={() => duplicate(tableId)}>복제</Button>
                <Button colorScheme="green" isDisabled={disabledRemoveButton}
                        onClick={() => remove(tableId)}>삭제</Button>
              </ButtonGroup>
            </Flex>
            <ScheduleTable
              key={tableId}
              schedules={schedules}
              tableId={tableId}
              onScheduleTimeClick={handlersMap.get(tableId)?.onScheduleTimeClick}
              onDeleteButtonClick={handlersMap.get(tableId)?.onDeleteButtonClick}
            />
          </Stack>
        ))}
      </Flex>
      <SearchDialog searchInfo={searchInfo} onClose={() => setSearchInfo(null)}/>
    </>
  );
}
