import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Table,
  Tag,
  TagCloseButton,
  TagLabel,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { useScheduleContext } from "./ScheduleContext.tsx";
import { Lecture } from "./types.ts";
import { parseSchedule } from "./utils.ts";
import axios from "axios";
import { DAY_LABELS } from "./constants.ts";

interface Props {
  searchInfo: {
    tableId: string;
    day?: string;
    time?: number;
  } | null;
  onClose: () => void;
}

interface SearchOption {
  query?: string;
  grades: number[];
  days: string[];
  times: number[];
  majors: string[];
  credits?: number;
}

const TIME_SLOTS = [
  { id: 1, label: "09:00~09:30" },
  { id: 2, label: "09:30~10:00" },
  { id: 3, label: "10:00~10:30" },
  { id: 4, label: "10:30~11:00" },
  { id: 5, label: "11:00~11:30" },
  { id: 6, label: "11:30~12:00" },
  { id: 7, label: "12:00~12:30" },
  { id: 8, label: "12:30~13:00" },
  { id: 9, label: "13:00~13:30" },
  { id: 10, label: "13:30~14:00" },
  { id: 11, label: "14:00~14:30" },
  { id: 12, label: "14:30~15:00" },
  { id: 13, label: "15:00~15:30" },
  { id: 14, label: "15:30~16:00" },
  { id: 15, label: "16:00~16:30" },
  { id: 16, label: "16:30~17:00" },
  { id: 17, label: "17:00~17:30" },
  { id: 18, label: "17:30~18:00" },
  { id: 19, label: "18:00~18:50" },
  { id: 20, label: "18:55~19:45" },
  { id: 21, label: "19:50~20:40" },
  { id: 22, label: "20:45~21:35" },
  { id: 23, label: "21:40~22:30" },
  { id: 24, label: "22:35~23:25" },
];

const PAGE_SIZE = 100;

// 검색어 필터 컴포넌트 - 독립적으로 메모이제이션
const QueryFilter = memo(
  ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => {
    return (
      <FormControl>
        <FormLabel>검색어</FormLabel>
        <Input
          placeholder="과목명 또는 과목코드"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </FormControl>
    );
  }
);
QueryFilter.displayName = "QueryFilter";

// 학점 필터 컴포넌트 - 독립적으로 메모이제이션
const CreditsFilter = memo(
  ({
    value,
    onChange,
  }: {
    value?: number;
    onChange: (value?: number) => void;
  }) => {
    return (
      <FormControl>
        <FormLabel>학점</FormLabel>
        <Select
          value={value}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : undefined)
          }>
          <option value="">전체</option>
          <option value="1">1학점</option>
          <option value="2">2학점</option>
          <option value="3">3학점</option>
        </Select>
      </FormControl>
    );
  }
);
CreditsFilter.displayName = "CreditsFilter";

// 학년 필터 컴포넌트 - 독립적으로 메모이제이션
const GradesFilter = memo(
  ({
    value,
    onChange,
  }: {
    value: number[];
    onChange: (value: number[]) => void;
  }) => {
    return (
      <FormControl>
        <FormLabel>학년</FormLabel>
        <CheckboxGroup
          value={value}
          onChange={(values) => onChange(values.map(Number))}>
          <HStack spacing={4}>
            {[1, 2, 3, 4].map((grade) => (
              <Checkbox key={grade} value={grade}>
                {grade}학년
              </Checkbox>
            ))}
          </HStack>
        </CheckboxGroup>
      </FormControl>
    );
  }
);
GradesFilter.displayName = "GradesFilter";

// 요일 필터 컴포넌트 - 독립적으로 메모이제이션
const DaysFilter = memo(
  ({
    value,
    onChange,
  }: {
    value: string[];
    onChange: (value: string[]) => void;
  }) => {
    return (
      <FormControl>
        <FormLabel>요일</FormLabel>
        <CheckboxGroup
          value={value}
          onChange={(values) => onChange(values as string[])}>
          <HStack spacing={4}>
            {DAY_LABELS.map((day) => (
              <Checkbox key={day} value={day}>
                {day}
              </Checkbox>
            ))}
          </HStack>
        </CheckboxGroup>
      </FormControl>
    );
  }
);
DaysFilter.displayName = "DaysFilter";

// 시간 필터 컴포넌트 - 독립적으로 메모이제이션
const TimesFilter = memo(
  ({
    value,
    sortedTimes,
    onChange,
  }: {
    value: number[];
    sortedTimes: number[];
    onChange: (value: number[]) => void;
  }) => {
    return (
      <FormControl>
        <FormLabel>시간</FormLabel>
        <CheckboxGroup
          colorScheme="green"
          value={value}
          onChange={(values) => onChange(values.map(Number))}>
          <Wrap spacing={1} mb={2}>
            {sortedTimes.map((time) => (
              <Tag key={time} size="sm" variant="outline" colorScheme="blue">
                <TagLabel>{time}교시</TagLabel>
                <TagCloseButton
                  onClick={() => onChange(value.filter((v) => v !== time))}
                />
              </Tag>
            ))}
          </Wrap>
          <Stack
            spacing={2}
            overflowY="auto"
            h="100px"
            border="1px solid"
            borderColor="gray.200"
            borderRadius={5}
            p={2}>
            {TIME_SLOTS.map(({ id, label }) => (
              <Box key={id}>
                <Checkbox key={id} size="sm" value={id}>
                  {id}교시({label})
                </Checkbox>
              </Box>
            ))}
          </Stack>
        </CheckboxGroup>
      </FormControl>
    );
  }
);
TimesFilter.displayName = "TimesFilter";

// 전공 필터 컴포넌트 - 독립적으로 메모이제이션
const MajorsFilter = memo(
  ({
    value,
    allMajors,
    onChange,
  }: {
    value: string[];
    allMajors: string[];
    onChange: (value: string[]) => void;
  }) => {
    return (
      <FormControl>
        <FormLabel>전공</FormLabel>
        <CheckboxGroup
          colorScheme="green"
          value={value}
          onChange={(values) => onChange(values as string[])}>
          <Wrap spacing={1} mb={2}>
            {value.map((major) => (
              <Tag key={major} size="sm" variant="outline" colorScheme="blue">
                <TagLabel>{major.split("<p>").pop()}</TagLabel>
                <TagCloseButton
                  onClick={() => onChange(value.filter((v) => v !== major))}
                />
              </Tag>
            ))}
          </Wrap>
          <Stack
            spacing={2}
            overflowY="auto"
            h="100px"
            border="1px solid"
            borderColor="gray.200"
            borderRadius={5}
            p={2}>
            {allMajors.map((major) => (
              <Box key={major}>
                <Checkbox key={major} size="sm" value={major}>
                  {major.replace(/<p>/gi, " ")}
                </Checkbox>
              </Box>
            ))}
          </Stack>
        </CheckboxGroup>
      </FormControl>
    );
  }
);
MajorsFilter.displayName = "MajorsFilter";

// 필터 그룹 컨테이너 컴포넌트들 - 독립적으로 메모이제이션
// 각 Row는 자신이 감싸는 필터의 props만 받아서 독립적으로 리렌더링
const FilterRow1 = memo(
  ({
    queryValue,
    queryOnChange,
    creditsValue,
    creditsOnChange,
  }: {
    queryValue: string;
    queryOnChange: (value: string) => void;
    creditsValue?: number;
    creditsOnChange: (value?: number) => void;
  }) => {
    return (
      <HStack spacing={4}>
        <QueryFilter value={queryValue} onChange={queryOnChange} />
        <CreditsFilter value={creditsValue} onChange={creditsOnChange} />
      </HStack>
    );
  },
  (prevProps, nextProps) => {
    // query와 credits만 비교하여 리렌더링 여부 결정
    return (
      prevProps.queryValue === nextProps.queryValue &&
      prevProps.queryOnChange === nextProps.queryOnChange &&
      prevProps.creditsValue === nextProps.creditsValue &&
      prevProps.creditsOnChange === nextProps.creditsOnChange
    );
  }
);
FilterRow1.displayName = "FilterRow1";

const FilterRow2 = memo(
  ({
    gradesValue,
    gradesOnChange,
    daysValue,
    daysOnChange,
  }: {
    gradesValue: number[];
    gradesOnChange: (value: number[]) => void;
    daysValue: string[];
    daysOnChange: (value: string[]) => void;
  }) => {
    return (
      <HStack spacing={4}>
        <GradesFilter value={gradesValue} onChange={gradesOnChange} />
        <DaysFilter value={daysValue} onChange={daysOnChange} />
      </HStack>
    );
  },
  (prevProps, nextProps) => {
    // grades와 days만 비교하여 리렌더링 여부 결정
    return (
      prevProps.gradesValue === nextProps.gradesValue &&
      prevProps.gradesOnChange === nextProps.gradesOnChange &&
      prevProps.daysValue === nextProps.daysValue &&
      prevProps.daysOnChange === nextProps.daysOnChange
    );
  }
);
FilterRow2.displayName = "FilterRow2";

const FilterRow3 = memo(
  ({
    timesValue,
    sortedTimes,
    timesOnChange,
    majorsValue,
    allMajors,
    majorsOnChange,
  }: {
    timesValue: number[];
    sortedTimes: number[];
    timesOnChange: (value: number[]) => void;
    majorsValue: string[];
    allMajors: string[];
    majorsOnChange: (value: string[]) => void;
  }) => {
    return (
      <HStack spacing={4}>
        <TimesFilter
          value={timesValue}
          sortedTimes={sortedTimes}
          onChange={timesOnChange}
        />
        <MajorsFilter
          value={majorsValue}
          allMajors={allMajors}
          onChange={majorsOnChange}
        />
      </HStack>
    );
  },
  (prevProps, nextProps) => {
    // times와 majors만 비교하여 리렌더링 여부 결정
    return (
      prevProps.timesValue === nextProps.timesValue &&
      prevProps.sortedTimes === nextProps.sortedTimes &&
      prevProps.timesOnChange === nextProps.timesOnChange &&
      prevProps.majorsValue === nextProps.majorsValue &&
      prevProps.allMajors === nextProps.allMajors &&
      prevProps.majorsOnChange === nextProps.majorsOnChange
    );
  }
);
FilterRow3.displayName = "FilterRow3";

const fetchMajors = () => axios.get<Lecture[]>("/schedules-majors.json");
const fetchLiberalArts = () =>
  axios.get<Lecture[]>("/schedules-liberal-arts.json");

// TODO: 이 코드를 개선해서 API 호출을 최소화 해보세요 + Promise.all이 현재 잘못 사용되고 있습니다. 같이 개선해주세요.
// 개선 완료 : 개선만 진행하고 기존의 코드는 최대한 유지했습니다.
// 1. 캐시 로직을 담은 클로저 함수 정의
const createCacheFetcher = () => {
  // Promise를 저장할 공간 (Key: API 이름 혹은 URL, Value: 해당 요청의 Promise)
  const cache = new Map<string, Promise<unknown>>();

  // 제네릭 타입을 명시적으로 선언
  return async <T,>(key: string, fetcher: () => Promise<T>): Promise<T> => {
    // 이미 캐시에 해당 키가 있다면, 새로 호출하지 않고 기존 Promise를 반환
    if (cache.has(key)) {
      return cache.get(key)! as Promise<T>;
    }

    // 캐시에 없다면 fetcher를 실행하고 그 Promise를 캐시에 저장
    // 에러 발생 시 캐시에서 제거하여 다음 요청 시 재시도 가능하도록 함
    const requestPromise = fetcher().catch((error) => {
      cache.delete(key); // 에러 발생 시 캐시에서 제거
      throw error;
    });
    cache.set(key, requestPromise);

    return requestPromise;
  };
};

// 2. 캐시 함수 생성
const cachedFetch = createCacheFetcher();

// 3. 모든 API 호출 함수 정의
const fetchAllLectures = async () => {
  return await Promise.all([
    (console.log("API Call 1", performance.now()),
    cachedFetch("majors", fetchMajors)),
    (console.log("API Call 2", performance.now()),
    cachedFetch("liberalArts", fetchLiberalArts)),
    (console.log("API Call 3", performance.now()),
    cachedFetch("majors", fetchMajors)),
    (console.log("API Call 4", performance.now()),
    cachedFetch("liberalArts", fetchLiberalArts)),
    (console.log("API Call 5", performance.now()),
    cachedFetch("majors", fetchMajors)),
    (console.log("API Call 6", performance.now()),
    cachedFetch("liberalArts", fetchLiberalArts)),
  ]);
};

// TODO: 이 컴포넌트에서 불필요한 연산이 발생하지 않도록 다양한 방식으로 시도해주세요.
const SearchDialog = ({ searchInfo, onClose }: Props) => {
  const { setSchedulesMap } = useScheduleContext();

  const loaderWrapperRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [page, setPage] = useState(1);
  const [searchOptions, setSearchOptions] = useState<SearchOption>({
    query: "",
    grades: [],
    days: [],
    times: [],
    majors: [],
  });

  // 검색 결과 필터링 - lectures나 searchOptions가 변경될 때만 재계산
  const filteredLectures = useMemo(() => {
    const { query = "", credits, grades, days, times, majors } = searchOptions;
    return lectures
      .filter(
        (lecture) =>
          lecture.title.toLowerCase().includes(query.toLowerCase()) ||
          lecture.id.toLowerCase().includes(query.toLowerCase())
      )
      .filter(
        (lecture) => grades.length === 0 || grades.includes(lecture.grade)
      )
      .filter(
        (lecture) => majors.length === 0 || majors.includes(lecture.major)
      )
      .filter(
        (lecture) => !credits || lecture.credits.startsWith(String(credits))
      )
      .filter((lecture) => {
        if (days.length === 0) {
          return true;
        }
        const schedules = lecture.schedule
          ? parseSchedule(lecture.schedule)
          : [];
        return schedules.some((s) => days.includes(s.day));
      })
      .filter((lecture) => {
        if (times.length === 0) {
          return true;
        }
        const schedules = lecture.schedule
          ? parseSchedule(lecture.schedule)
          : [];
        return schedules.some((s) =>
          s.range.some((time) => times.includes(time))
        );
      });
  }, [lectures, searchOptions]);

  // 마지막 페이지 계산 - filteredLectures가 변경될 때만 재계산
  const lastPage = useMemo(
    () => Math.ceil(filteredLectures.length / PAGE_SIZE),
    [filteredLectures.length]
  );

  // 보이는 강의 목록 - filteredLectures나 page가 변경될 때만 재계산
  const visibleLectures = useMemo(
    () => filteredLectures.slice(0, page * PAGE_SIZE),
    [filteredLectures, page]
  );

  // times 정렬 메모이제이션 - 렌더링 중 정렬 연산 방지
  const sortedTimes = useMemo(
    () => [...searchOptions.times].sort((a, b) => a - b),
    [searchOptions.times]
  );

  // 모든 전공 목록 - lectures가 변경될 때만 재계산
  const allMajors = useMemo(
    () => [...new Set(lectures.map((lecture) => lecture.major))],
    [lectures]
  );

  // 검색 옵션 변경 핸들러들 - 각 필터별로 독립적으로 메모이제이션
  const handleQueryChange = useCallback((value: string) => {
    setPage(1);
    setSearchOptions((prev) => ({ ...prev, query: value }));
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);

  const handleCreditsChange = useCallback((value?: number) => {
    setPage(1);
    setSearchOptions((prev) => ({ ...prev, credits: value }));
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);

  const handleGradesChange = useCallback((value: number[]) => {
    setPage(1);
    setSearchOptions((prev) => ({ ...prev, grades: value }));
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);

  const handleDaysChange = useCallback((value: string[]) => {
    setPage(1);
    setSearchOptions((prev) => ({ ...prev, days: value }));
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);

  const handleTimesChange = useCallback((value: number[]) => {
    setPage(1);
    setSearchOptions((prev) => ({ ...prev, times: value }));
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);

  const handleMajorsChange = useCallback((value: string[]) => {
    setPage(1);
    setSearchOptions((prev) => ({ ...prev, majors: value }));
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);

  // 스케쥴 추가
  const addSchedule = (lecture: Lecture) => {
    if (!searchInfo) return;

    const { tableId } = searchInfo;

    const schedules = parseSchedule(lecture.schedule).map((schedule) => ({
      ...schedule,
      lecture,
    }));

    setSchedulesMap((prev) => ({
      ...prev,
      [tableId]: [...prev[tableId], ...schedules],
    }));

    onClose();
  };

  // 모든 API 호출
  useEffect(() => {
    const start = performance.now();
    console.log("API 호출 시작: ", start);
    fetchAllLectures().then((results) => {
      const end = performance.now();
      console.log("모든 API 호출 완료 ", end);
      console.log("API 호출에 걸린 시간(ms): ", end - start);
      setLectures(results.flatMap((result) => result.data));
    });
  }, []);

  // 스크롤 관찰
  useEffect(() => {
    const $loader = loaderRef.current;
    const $loaderWrapper = loaderWrapperRef.current;

    if (!$loader || !$loaderWrapper) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prevPage) => Math.min(lastPage, prevPage + 1));
        }
      },
      { threshold: 0, root: $loaderWrapper }
    );

    observer.observe($loader);

    return () => observer.unobserve($loader);
  }, [lastPage]);

  // 검색 정보 변경
  useEffect(() => {
    setSearchOptions((prev) => ({
      ...prev,
      days: searchInfo?.day ? [searchInfo.day] : [],
      times: searchInfo?.time ? [searchInfo.time] : [],
    }));
    setPage(1);
  }, [searchInfo]);

  return (
    <Modal isOpen={Boolean(searchInfo)} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxW="90vw" w="1000px">
        <ModalHeader>수업 검색</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FilterRow1
              queryValue={searchOptions.query || ""}
              queryOnChange={handleQueryChange}
              creditsValue={searchOptions.credits}
              creditsOnChange={handleCreditsChange}
            />

            <FilterRow2
              gradesValue={searchOptions.grades}
              gradesOnChange={handleGradesChange}
              daysValue={searchOptions.days}
              daysOnChange={handleDaysChange}
            />

            <FilterRow3
              timesValue={searchOptions.times}
              sortedTimes={sortedTimes}
              timesOnChange={handleTimesChange}
              majorsValue={searchOptions.majors}
              allMajors={allMajors}
              majorsOnChange={handleMajorsChange}
            />
            <Text align="right">검색결과: {filteredLectures.length}개</Text>
            <Box>
              <Table>
                <Thead>
                  <Tr>
                    <Th width="100px">과목코드</Th>
                    <Th width="50px">학년</Th>
                    <Th width="200px">과목명</Th>
                    <Th width="50px">학점</Th>
                    <Th width="150px">전공</Th>
                    <Th width="150px">시간</Th>
                    <Th width="80px"></Th>
                  </Tr>
                </Thead>
              </Table>

              <Box overflowY="auto" maxH="500px" ref={loaderWrapperRef}>
                <Table size="sm" variant="striped">
                  <Tbody>
                    {visibleLectures.map((lecture, index) => (
                      <Tr key={`${lecture.id}-${index}`}>
                        <Td width="100px">{lecture.id}</Td>
                        <Td width="50px">{lecture.grade}</Td>
                        <Td width="200px">{lecture.title}</Td>
                        <Td width="50px">{lecture.credits}</Td>
                        <Td
                          width="150px"
                          dangerouslySetInnerHTML={{ __html: lecture.major }}
                        />
                        <Td
                          width="150px"
                          dangerouslySetInnerHTML={{ __html: lecture.schedule }}
                        />
                        <Td width="80px">
                          <Button
                            size="sm"
                            colorScheme="green"
                            onClick={() => addSchedule(lecture)}>
                            추가
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                <Box ref={loaderRef} h="20px" />
              </Box>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SearchDialog;
