import type { SourceLine, SupportedLanguage } from '$lib/trace/types';
import type { SortingAlgorithm, SortingEvent } from './sorting';

/**
 * Curated four-language source for every sorting algorithm in the arena.
 *
 * Each source line may carry a `semanticOperationId` equal to a `SortingEvent`.
 * The arena highlights the line whose id matches the current step's event, so
 * the same deterministic trace lights up the equivalent line in C, C++, Java,
 * and Python without maintaining four separate step streams.
 */
type Def = [text: string, semantic?: SortingEvent];

function build(defs: Def[]): SourceLine[] {
  return defs.map(([text, semantic], index) => ({
    id: `l${index + 1}`,
    number: index + 1,
    text,
    ...(semantic ? { semanticOperationId: semantic } : {})
  }));
}

type LanguageSource = Record<SupportedLanguage, SourceLine[]>;

const bubble: LanguageSource = {
  c: build([
    ['void bubbleSort(int a[], int n) {', 'start'],
    ['  for (int i = 0; i < n - 1; i++) {', 'pass'],
    ['    int swapped = 0;'],
    ['    for (int j = 0; j < n - 1 - i; j++) {'],
    ['      if (a[j] > a[j + 1]) {', 'compare'],
    ['        int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;', 'swap'],
    ['        swapped = 1;'],
    ['      }'],
    ['    }'],
    ['    /* largest remaining value settled on the right */', 'mark-sorted'],
    ['    if (!swapped) break;'],
    ['  }'],
    ['}', 'complete']
  ]),
  cpp: build([
    ['void bubbleSort(std::vector<int>& a) {', 'start'],
    ['  for (size_t i = 0; i + 1 < a.size(); i++) {', 'pass'],
    ['    bool swapped = false;'],
    ['    for (size_t j = 0; j + 1 < a.size() - i; j++) {'],
    ['      if (a[j] > a[j + 1]) {', 'compare'],
    ['        std::swap(a[j], a[j + 1]);', 'swap'],
    ['        swapped = true;'],
    ['      }'],
    ['    }'],
    ['    // largest remaining value settled on the right', 'mark-sorted'],
    ['    if (!swapped) break;'],
    ['  }'],
    ['}', 'complete']
  ]),
  java: build([
    ['static void bubbleSort(int[] a) {', 'start'],
    ['  for (int i = 0; i < a.length - 1; i++) {', 'pass'],
    ['    boolean swapped = false;'],
    ['    for (int j = 0; j < a.length - 1 - i; j++) {'],
    ['      if (a[j] > a[j + 1]) {', 'compare'],
    ['        int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;', 'swap'],
    ['        swapped = true;'],
    ['      }'],
    ['    }'],
    ['    // largest remaining value settled on the right', 'mark-sorted'],
    ['    if (!swapped) break;'],
    ['  }'],
    ['}', 'complete']
  ]),
  python: build([
    ['def bubble_sort(a):', 'start'],
    ['    for i in range(len(a) - 1):', 'pass'],
    ['        swapped = False'],
    ['        for j in range(len(a) - 1 - i):'],
    ['            if a[j] > a[j + 1]:', 'compare'],
    ['                a[j], a[j + 1] = a[j + 1], a[j]', 'swap'],
    ['                swapped = True'],
    ['        # largest remaining value settled on the right', 'mark-sorted'],
    ['        if not swapped:'],
    ['            break'],
    ['    return a', 'complete']
  ])
};

const selection: LanguageSource = {
  c: build([
    ['void selectionSort(int a[], int n) {', 'start'],
    ['  for (int i = 0; i < n - 1; i++) {', 'pass'],
    ['    int min = i;', 'select'],
    ['    for (int j = i + 1; j < n; j++) {'],
    ['      if (a[j] < a[min]) min = j;', 'compare'],
    ['    }'],
    ['    int t = a[i]; a[i] = a[min]; a[min] = t;', 'swap'],
    ['    /* a[i] now holds the i-th smallest value */', 'mark-sorted'],
    ['  }'],
    ['}', 'complete']
  ]),
  cpp: build([
    ['void selectionSort(std::vector<int>& a) {', 'start'],
    ['  for (size_t i = 0; i + 1 < a.size(); i++) {', 'pass'],
    ['    size_t min = i;', 'select'],
    ['    for (size_t j = i + 1; j < a.size(); j++) {'],
    ['      if (a[j] < a[min]) min = j;', 'compare'],
    ['    }'],
    ['    std::swap(a[i], a[min]);', 'swap'],
    ['    // a[i] now holds the i-th smallest value', 'mark-sorted'],
    ['  }'],
    ['}', 'complete']
  ]),
  java: build([
    ['static void selectionSort(int[] a) {', 'start'],
    ['  for (int i = 0; i < a.length - 1; i++) {', 'pass'],
    ['    int min = i;', 'select'],
    ['    for (int j = i + 1; j < a.length; j++) {'],
    ['      if (a[j] < a[min]) min = j;', 'compare'],
    ['    }'],
    ['    int t = a[i]; a[i] = a[min]; a[min] = t;', 'swap'],
    ['    // a[i] now holds the i-th smallest value', 'mark-sorted'],
    ['  }'],
    ['}', 'complete']
  ]),
  python: build([
    ['def selection_sort(a):', 'start'],
    ['    for i in range(len(a) - 1):', 'pass'],
    ['        min_i = i', 'select'],
    ['        for j in range(i + 1, len(a)):'],
    ['            if a[j] < a[min_i]:', 'compare'],
    ['                min_i = j'],
    ['        a[i], a[min_i] = a[min_i], a[i]', 'swap'],
    ['        # a[i] now holds the i-th smallest value', 'mark-sorted'],
    ['    return a', 'complete']
  ])
};

const insertion: LanguageSource = {
  c: build([
    ['void insertionSort(int a[], int n) {', 'start'],
    ['  for (int i = 1; i < n; i++) {', 'pass'],
    ['    int key = a[i], j = i - 1;'],
    ['    while (j >= 0 && a[j] > key) {', 'compare'],
    ['      a[j + 1] = a[j];', 'write'],
    ['      j--;'],
    ['    }'],
    ['    a[j + 1] = key;', 'write'],
    ['    /* prefix a[0..i] is now sorted */', 'mark-sorted'],
    ['  }'],
    ['}', 'complete']
  ]),
  cpp: build([
    ['void insertionSort(std::vector<int>& a) {', 'start'],
    ['  for (size_t i = 1; i < a.size(); i++) {', 'pass'],
    ['    int key = a[i]; long j = (long)i - 1;'],
    ['    while (j >= 0 && a[j] > key) {', 'compare'],
    ['      a[j + 1] = a[j];', 'write'],
    ['      j--;'],
    ['    }'],
    ['    a[j + 1] = key;', 'write'],
    ['    // prefix a[0..i] is now sorted', 'mark-sorted'],
    ['  }'],
    ['}', 'complete']
  ]),
  java: build([
    ['static void insertionSort(int[] a) {', 'start'],
    ['  for (int i = 1; i < a.length; i++) {', 'pass'],
    ['    int key = a[i], j = i - 1;'],
    ['    while (j >= 0 && a[j] > key) {', 'compare'],
    ['      a[j + 1] = a[j];', 'write'],
    ['      j--;'],
    ['    }'],
    ['    a[j + 1] = key;', 'write'],
    ['    // prefix a[0..i] is now sorted', 'mark-sorted'],
    ['  }'],
    ['}', 'complete']
  ]),
  python: build([
    ['def insertion_sort(a):', 'start'],
    ['    for i in range(1, len(a)):', 'pass'],
    ['        key = a[i]; j = i - 1'],
    ['        while j >= 0 and a[j] > key:', 'compare'],
    ['            a[j + 1] = a[j]', 'write'],
    ['            j -= 1'],
    ['        a[j + 1] = key', 'write'],
    ['        # prefix a[0..i] is now sorted', 'mark-sorted'],
    ['    return a', 'complete']
  ])
};

const merge: LanguageSource = {
  c: build([
    ['void merge(int a[], int lo, int mid, int hi, int buf[]) {', 'start'],
    ['  int i = lo, j = mid + 1, k = lo;'],
    ['  while (i <= mid && j <= hi) {'],
    ['    if (a[i] <= a[j]) buf[k++] = a[i++];', 'compare'],
    ['    else buf[k++] = a[j++];'],
    ['  }'],
    ['  while (i <= mid) buf[k++] = a[i++];'],
    ['  while (j <= hi) buf[k++] = a[j++];'],
    ['  for (int t = lo; t <= hi; t++) a[t] = buf[t];', 'write'],
    ['  /* subarray a[lo..hi] is now merged and sorted */', 'mark-sorted'],
    ['}', 'complete'],
    ['void mergeSort(int a[], int lo, int hi, int buf[]) {', 'pass'],
    ['  if (lo >= hi) return;'],
    ['  int mid = (lo + hi) / 2;'],
    ['  mergeSort(a, lo, mid, buf);'],
    ['  mergeSort(a, mid + 1, hi, buf);'],
    ['  merge(a, lo, mid, hi, buf);'],
    ['}']
  ]),
  cpp: build([
    ['void merge(std::vector<int>& a, int lo, int mid, int hi) {', 'start'],
    ['  std::vector<int> buf; int i = lo, j = mid + 1;'],
    ['  while (i <= mid && j <= hi) {'],
    ['    if (a[i] <= a[j]) buf.push_back(a[i++]);', 'compare'],
    ['    else buf.push_back(a[j++]);'],
    ['  }'],
    ['  while (i <= mid) buf.push_back(a[i++]);'],
    ['  while (j <= hi) buf.push_back(a[j++]);'],
    ['  for (int t = 0; t < (int)buf.size(); t++) a[lo + t] = buf[t];', 'write'],
    ['  // subarray a[lo..hi] is now merged and sorted', 'mark-sorted'],
    ['}', 'complete'],
    ['void mergeSort(std::vector<int>& a, int lo, int hi) {', 'pass'],
    ['  if (lo >= hi) return;'],
    ['  int mid = (lo + hi) / 2;'],
    ['  mergeSort(a, lo, mid); mergeSort(a, mid + 1, hi);'],
    ['  merge(a, lo, mid, hi);'],
    ['}']
  ]),
  java: build([
    ['static void merge(int[] a, int lo, int mid, int hi, int[] buf) {', 'start'],
    ['  int i = lo, j = mid + 1, k = lo;'],
    ['  while (i <= mid && j <= hi) {'],
    ['    if (a[i] <= a[j]) buf[k++] = a[i++];', 'compare'],
    ['    else buf[k++] = a[j++];'],
    ['  }'],
    ['  while (i <= mid) buf[k++] = a[i++];'],
    ['  while (j <= hi) buf[k++] = a[j++];'],
    ['  for (int t = lo; t <= hi; t++) a[t] = buf[t];', 'write'],
    ['  // subarray a[lo..hi] is now merged and sorted', 'mark-sorted'],
    ['}', 'complete'],
    ['static void mergeSort(int[] a, int lo, int hi, int[] buf) {', 'pass'],
    ['  if (lo >= hi) return;'],
    ['  int mid = (lo + hi) / 2;'],
    ['  mergeSort(a, lo, mid, buf); mergeSort(a, mid + 1, hi, buf);'],
    ['  merge(a, lo, mid, hi, buf);'],
    ['}']
  ]),
  python: build([
    ['def merge_sort(a):', 'pass'],
    ['    if len(a) <= 1:'],
    ['        return a'],
    ['    mid = len(a) // 2'],
    ['    left = merge_sort(a[:mid])'],
    ['    right = merge_sort(a[mid:])'],
    ['    out, i, j = [], 0, 0', 'start'],
    ['    while i < len(left) and j < len(right):'],
    ['        if left[i] <= right[j]:', 'compare'],
    ['            out.append(left[i]); i += 1', 'write'],
    ['        else:'],
    ['            out.append(right[j]); j += 1'],
    ['    out += left[i:]; out += right[j:]'],
    ['    # subarray is now merged and sorted', 'mark-sorted'],
    ['    return out', 'complete']
  ])
};

const quick: LanguageSource = {
  c: build([
    ['int partition(int a[], int lo, int hi) {', 'pass'],
    ['  int pivot = a[hi], i = lo - 1;'],
    ['  for (int j = lo; j < hi; j++) {'],
    ['    if (a[j] <= pivot) {', 'compare'],
    ['      i++;'],
    ['      int t = a[i]; a[i] = a[j]; a[j] = t;', 'swap'],
    ['    }'],
    ['  }'],
    ['  int t = a[i + 1]; a[i + 1] = a[hi]; a[hi] = t;', 'swap'],
    ['  return i + 1;', 'mark-sorted'],
    ['}'],
    ['void quickSort(int a[], int lo, int hi) {', 'start'],
    ['  if (lo >= hi) return;'],
    ['  int p = partition(a, lo, hi);'],
    ['  quickSort(a, lo, p - 1);'],
    ['  quickSort(a, p + 1, hi);'],
    ['}', 'complete']
  ]),
  cpp: build([
    ['int partition(std::vector<int>& a, int lo, int hi) {', 'pass'],
    ['  int pivot = a[hi], i = lo - 1;'],
    ['  for (int j = lo; j < hi; j++) {'],
    ['    if (a[j] <= pivot) {', 'compare'],
    ['      std::swap(a[++i], a[j]);', 'swap'],
    ['    }'],
    ['  }'],
    ['  std::swap(a[i + 1], a[hi]);', 'swap'],
    ['  return i + 1;', 'mark-sorted'],
    ['}'],
    ['void quickSort(std::vector<int>& a, int lo, int hi) {', 'start'],
    ['  if (lo >= hi) return;'],
    ['  int p = partition(a, lo, hi);'],
    ['  quickSort(a, lo, p - 1); quickSort(a, p + 1, hi);'],
    ['}', 'complete']
  ]),
  java: build([
    ['static int partition(int[] a, int lo, int hi) {', 'pass'],
    ['  int pivot = a[hi], i = lo - 1;'],
    ['  for (int j = lo; j < hi; j++) {'],
    ['    if (a[j] <= pivot) {', 'compare'],
    ['      i++;'],
    ['      int t = a[i]; a[i] = a[j]; a[j] = t;', 'swap'],
    ['    }'],
    ['  }'],
    ['  int t = a[i + 1]; a[i + 1] = a[hi]; a[hi] = t;', 'swap'],
    ['  return i + 1;', 'mark-sorted'],
    ['}'],
    ['static void quickSort(int[] a, int lo, int hi) {', 'start'],
    ['  if (lo >= hi) return;'],
    ['  int p = partition(a, lo, hi);'],
    ['  quickSort(a, lo, p - 1); quickSort(a, p + 1, hi);'],
    ['}', 'complete']
  ]),
  python: build([
    ['def quick_sort(a, lo, hi):', 'start'],
    ['    if lo >= hi:'],
    ['        return'],
    ['    pivot = a[hi]; i = lo - 1', 'pass'],
    ['    for j in range(lo, hi):'],
    ['        if a[j] <= pivot:', 'compare'],
    ['            i += 1'],
    ['            a[i], a[j] = a[j], a[i]', 'swap'],
    ['    a[i + 1], a[hi] = a[hi], a[i + 1]', 'swap'],
    ['    p = i + 1  # pivot now in final place', 'mark-sorted'],
    ['    quick_sort(a, lo, p - 1)'],
    ['    quick_sort(a, p + 1, hi)', 'complete']
  ])
};

const heap: LanguageSource = {
  c: build([
    ['void siftDown(int a[], int n, int i) {', 'pass'],
    ['  int largest = i, l = 2*i + 1, r = 2*i + 2;'],
    ['  if (l < n && a[l] > a[largest]) largest = l;', 'compare'],
    ['  if (r < n && a[r] > a[largest]) largest = r;', 'compare'],
    ['  if (largest != i) {'],
    ['    int t = a[i]; a[i] = a[largest]; a[largest] = t;', 'swap'],
    ['    siftDown(a, n, largest);'],
    ['  }'],
    ['}'],
    ['void heapSort(int a[], int n) {', 'start'],
    ['  for (int i = n/2 - 1; i >= 0; i--) siftDown(a, n, i);'],
    ['  for (int end = n - 1; end > 0; end--) {'],
    ['    int t = a[0]; a[0] = a[end]; a[end] = t;', 'swap'],
    ['    /* max moved to the end of the heap */', 'mark-sorted'],
    ['    siftDown(a, end, 0);'],
    ['  }'],
    ['}', 'complete']
  ]),
  cpp: build([
    ['void siftDown(std::vector<int>& a, int n, int i) {', 'pass'],
    ['  int largest = i, l = 2*i + 1, r = 2*i + 2;'],
    ['  if (l < n && a[l] > a[largest]) largest = l;', 'compare'],
    ['  if (r < n && a[r] > a[largest]) largest = r;', 'compare'],
    ['  if (largest != i) {'],
    ['    std::swap(a[i], a[largest]);', 'swap'],
    ['    siftDown(a, n, largest);'],
    ['  }'],
    ['}'],
    ['void heapSort(std::vector<int>& a) {', 'start'],
    ['  int n = a.size();'],
    ['  for (int i = n/2 - 1; i >= 0; i--) siftDown(a, n, i);'],
    ['  for (int end = n - 1; end > 0; end--) {'],
    ['    std::swap(a[0], a[end]);', 'swap'],
    ['    // max moved to the end of the heap', 'mark-sorted'],
    ['    siftDown(a, end, 0);'],
    ['  }'],
    ['}', 'complete']
  ]),
  java: build([
    ['static void siftDown(int[] a, int n, int i) {', 'pass'],
    ['  int largest = i, l = 2*i + 1, r = 2*i + 2;'],
    ['  if (l < n && a[l] > a[largest]) largest = l;', 'compare'],
    ['  if (r < n && a[r] > a[largest]) largest = r;', 'compare'],
    ['  if (largest != i) {'],
    ['    int t = a[i]; a[i] = a[largest]; a[largest] = t;', 'swap'],
    ['    siftDown(a, n, largest);'],
    ['  }'],
    ['}'],
    ['static void heapSort(int[] a) {', 'start'],
    ['  int n = a.length;'],
    ['  for (int i = n/2 - 1; i >= 0; i--) siftDown(a, n, i);'],
    ['  for (int end = n - 1; end > 0; end--) {'],
    ['    int t = a[0]; a[0] = a[end]; a[end] = t;', 'swap'],
    ['    // max moved to the end of the heap', 'mark-sorted'],
    ['    siftDown(a, end, 0);'],
    ['  }'],
    ['}', 'complete']
  ]),
  python: build([
    ['def sift_down(a, n, i):', 'pass'],
    ['    largest, l, r = i, 2*i + 1, 2*i + 2'],
    ['    if l < n and a[l] > a[largest]:', 'compare'],
    ['        largest = l'],
    ['    if r < n and a[r] > a[largest]:', 'compare'],
    ['        largest = r'],
    ['    if largest != i:'],
    ['        a[i], a[largest] = a[largest], a[i]', 'swap'],
    ['        sift_down(a, n, largest)'],
    ['def heap_sort(a):', 'start'],
    ['    n = len(a)'],
    ['    for i in range(n // 2 - 1, -1, -1):'],
    ['        sift_down(a, n, i)'],
    ['    for end in range(n - 1, 0, -1):'],
    ['        a[0], a[end] = a[end], a[0]', 'swap'],
    ['        # max moved to the end of the heap', 'mark-sorted'],
    ['        sift_down(a, end, 0)'],
    ['    return a', 'complete']
  ])
};

const counting: LanguageSource = {
  c: build([
    ['void countingSort(int a[], int n, int max) {', 'start'],
    ['  int count[max + 1];'],
    ['  for (int i = 0; i <= max; i++) count[i] = 0;'],
    ['  for (int i = 0; i < n; i++) count[a[i]]++;', 'pass'],
    ['  for (int i = 1; i <= max; i++) count[i] += count[i - 1];'],
    ['  int out[n];'],
    ['  for (int i = n - 1; i >= 0; i--)'],
    ['    out[--count[a[i]]] = a[i];', 'write'],
    ['  for (int i = 0; i < n; i++) a[i] = out[i];', 'write'],
    ['}', 'complete']
  ]),
  cpp: build([
    ['void countingSort(std::vector<int>& a, int max) {', 'start'],
    ['  std::vector<int> count(max + 1, 0);'],
    ['  for (int v : a) count[v]++;', 'pass'],
    ['  for (int i = 1; i <= max; i++) count[i] += count[i - 1];'],
    ['  std::vector<int> out(a.size());'],
    ['  for (int i = a.size() - 1; i >= 0; i--)'],
    ['    out[--count[a[i]]] = a[i];', 'write'],
    ['  a = out;', 'write'],
    ['}', 'complete']
  ]),
  java: build([
    ['static void countingSort(int[] a, int max) {', 'start'],
    ['  int[] count = new int[max + 1];'],
    ['  for (int v : a) count[v]++;', 'pass'],
    ['  for (int i = 1; i <= max; i++) count[i] += count[i - 1];'],
    ['  int[] out = new int[a.length];'],
    ['  for (int i = a.length - 1; i >= 0; i--)'],
    ['    out[--count[a[i]]] = a[i];', 'write'],
    ['  System.arraycopy(out, 0, a, 0, a.length);', 'write'],
    ['}', 'complete']
  ]),
  python: build([
    ['def counting_sort(a):', 'start'],
    ['    hi = max(a)'],
    ['    count = [0] * (hi + 1)'],
    ['    for v in a:', 'pass'],
    ['        count[v] += 1'],
    ['    out = []'],
    ['    for value, c in enumerate(count):'],
    ['        out.extend([value] * c)', 'write'],
    ['    return out', 'complete']
  ])
};

const radix: LanguageSource = {
  c: build([
    ['void radixSort(int a[], int n) {', 'start'],
    ['  int max = a[0];'],
    ['  for (int i = 1; i < n; i++) if (a[i] > max) max = a[i];'],
    ['  for (int exp = 1; max / exp > 0; exp *= 10) {', 'pass'],
    ['    int out[n], count[10] = {0};'],
    ['    for (int i = 0; i < n; i++) count[(a[i]/exp)%10]++;'],
    ['    for (int i = 1; i < 10; i++) count[i] += count[i - 1];'],
    ['    for (int i = n - 1; i >= 0; i--)'],
    ['      out[--count[(a[i]/exp)%10]] = a[i];', 'write'],
    ['    for (int i = 0; i < n; i++) a[i] = out[i];', 'write'],
    ['    /* array now sorted by this digit */', 'mark-sorted'],
    ['  }'],
    ['}', 'complete']
  ]),
  cpp: build([
    ['void radixSort(std::vector<int>& a) {', 'start'],
    ['  int max = *std::max_element(a.begin(), a.end());'],
    ['  for (int exp = 1; max / exp > 0; exp *= 10) {', 'pass'],
    ['    std::vector<int> out(a.size()); int count[10] = {0};'],
    ['    for (int v : a) count[(v/exp)%10]++;'],
    ['    for (int i = 1; i < 10; i++) count[i] += count[i - 1];'],
    ['    for (int i = a.size() - 1; i >= 0; i--)'],
    ['      out[--count[(a[i]/exp)%10]] = a[i];', 'write'],
    ['    a = out;', 'write'],
    ['    // array now sorted by this digit', 'mark-sorted'],
    ['  }'],
    ['}', 'complete']
  ]),
  java: build([
    ['static void radixSort(int[] a) {', 'start'],
    ['  int max = Arrays.stream(a).max().getAsInt();'],
    ['  for (int exp = 1; max / exp > 0; exp *= 10) {', 'pass'],
    ['    int[] out = new int[a.length]; int[] count = new int[10];'],
    ['    for (int v : a) count[(v/exp)%10]++;'],
    ['    for (int i = 1; i < 10; i++) count[i] += count[i - 1];'],
    ['    for (int i = a.length - 1; i >= 0; i--)'],
    ['      out[--count[(a[i]/exp)%10]] = a[i];', 'write'],
    ['    System.arraycopy(out, 0, a, 0, a.length);', 'write'],
    ['    // array now sorted by this digit', 'mark-sorted'],
    ['  }'],
    ['}', 'complete']
  ]),
  python: build([
    ['def radix_sort(a):', 'start'],
    ['    hi = max(a)'],
    ['    exp = 1'],
    ['    while hi // exp > 0:', 'pass'],
    ['        buckets = [[] for _ in range(10)]'],
    ['        for v in a:'],
    ['            buckets[(v // exp) % 10].append(v)', 'write'],
    ['        a = [v for bucket in buckets for v in bucket]', 'write'],
    ['        # array now sorted by this digit', 'mark-sorted'],
    ['        exp *= 10'],
    ['    return a', 'complete']
  ])
};

export const SORTING_SOURCE: Record<SortingAlgorithm, LanguageSource> = {
  bubble,
  selection,
  insertion,
  merge,
  quick,
  heap,
  counting,
  radix
};

/**
 * Semantic id for the current step: the arena highlights the source line whose
 * `semanticOperationId` equals this value. The event maps 1:1 to a source line
 * within each algorithm, so the highlight follows the live trace in any language.
 */
export function sortingSemanticFor(event: SortingEvent): string {
  // 'select' only appears in selection sort; every other event tags a real line.
  return event;
}
