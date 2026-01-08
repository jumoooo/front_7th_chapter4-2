# 과제 체크포인트

## 과제 요구사항

- [x] 배포 후 url 제출
https://jumoooo.github.io/front_7th_chapter4-2/

- [x] API 호출 최적화(`Promise.all` 이해)

- [x] SearchDialog 불필요한 연산 최적화
- [x] SearchDialog 불필요한 리렌더링 최적화

- [x] 시간표 블록 드래그시 렌더링 최적화
- [x] 시간표 블록 드롭시 렌더링 최적화

## 과제 셀프회고

<!-- 과제에 대한 회고를 작성해주세요 -->

### 기술적 성장

`Promise.all`은 Promise 배열(또는 iterable)을 병렬로 실행하는데, 
기존 코드를 보니 `Promise.all` 안에서 `await`를 사용하고 있었습니다. 이렇게 하면 애초에 병렬 처리하려고 만든 내용 안에서 `await`를 해버려서 직렬로 처리되고 있었습니다. 그러니 내부 `await`를 제거하여 병렬로 처리하였습니다.

이미 호출한 API를 다시 호출하지 않도록 하려고 했는데, 처음에는 데이터를 캐싱하려고 했습니다. 그런데 문제가 있었습니다.
`Promise.all`은 지금 병렬 실행으로 해놨기 때문에, 데이터를 비교할 때 함수들이 거의 동시에 실행하기 때문에 시점 차이로 인해 비교가 안되어 결국 중복 요청을 막지 못합니다.
그리고 데이터는 첫 번째 요청의 답이 완료된 후에 캐싱되기 때문에, 첫 요청이 아직 진행 중이면 다른 요청에 대해서는 기준이 아직 생성이 안되어서 비교가 불가능합니다.
그래서 **데이터를 캐싱하는 게 아니라 Promise를 캐싱**하는 방식으로 변경했습니다.

**왜 Promise로 캐싱하면 다를까?**
요청을 시작하자마자 즉시 캐싱을 진행하여 비교가 가능합니다. 첫 로딩부터 중복을 제거할 수 있습니다.

**그래서 결국 뭐 했나요?**
기존 Promise 함수를 감싸서 캐시를 전달하는 함수를 생성했습니다. 사용할 때 명시적 식별을 하기 위해서 **문자열**을 **key**로 받게 만들었습니다.

**문자열 없이 하면 어떻게 되나요?**
참조값이라 같은 걸로 취급 안해줄 수 있습니다. 특히 함수의 매개변수가 서로 다르게 들어있다면 서로 매개변수에 따라 다른 데이터를 호출하는 함수인데 같은 Promise로 오류가 날 가능성이 있습니다. 익명 함수나 고차 함수 사용 시 매번 변할 수 있어서 안정성이 떨어집니다.

```typescript
const createCacheFetcher = () => {
  const cache = new Map<string, Promise<unknown>>();
  return async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
    if (cache.has(key)) {
      return cache.get(key)! as Promise<T>;
    }
    const requestPromise = fetcher().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, requestPromise); // Promise를 즉시 캐싱
    return requestPromise;
  };
};
```

이렇게 하니 캐시 후 콘솔을 보면 중복 요청이 제거된 것을 확인할 수 있었습니다.

### 코드 품질

Promise를 캐싱하는 방식으로 중복 API 호출을 방지한 부분이 가장 만족스럽습니다. 데이터를 캐싱하는 것보다 Promise를 캐싱하는 것이 더 효과적이라는 것을 알수 있었습니다.

```typescript
const createCacheFetcher = () => {
  const cache = new Map<string, Promise<unknown>>();
  return async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
    if (cache.has(key)) {
      return cache.get(key)! as Promise<T>;
    }
    const requestPromise = fetcher().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, requestPromise);
    return requestPromise;
  };
};
```

이 구현으로 첫 로딩부터 중복 요청을 제거할 수 있었습니다.

### 학습 효과 분석

데이터를 캐싱하는 것만으로는 부족하고, Promise 자체를 캐싱해야 중복 요청을 효과적으로 방지할 수 있다는 것을 배웠습니다. 특히 병렬 처리 환경에서의 캐싱 전략에 대해 깊이 이해할 수 있었습니다.
