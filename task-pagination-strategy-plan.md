# Task Pagination Strategy Plan

## Current Implementation Analysis

1. **Backend Limitation**:
   - In `backend/src/routes/tasks.ts`, line 61, there's a default limit of 100 tasks:
     ```typescript
     const take = parseInt(req.query.take as string) || 100;
     ```
   - The backend's `TaskService.getTasksByUserId` method supports pagination with `skip` and `take` parameters.

2. **Frontend Implementation**:
   - The `todoApi.fetchTasks()` method in `frontend/src/services/todoApi.ts` doesn't utilize pagination parameters.
   - `TodoContext.tsx` calls `todoApi.fetchTasks()` without pagination, only getting the first 100 tasks.
   - `TaskListContainer.tsx` displays tasks grouped by day but has no mechanism to handle pagination.

## Proposed Solution

I recommend implementing a **progressive loading strategy** that combines date-based filtering with pagination. This approach is well-suited for a task management application where:

1. Users primarily care about recent and upcoming tasks
2. The UI already displays tasks grouped by date
3. We want to maintain good performance even with large task collections

### Implementation Plan

1. **Modify Frontend API Service**:
   - Update `todoApi.fetchTasks()` to support pagination parameters and date range filtering
   - Add a new method to check for the total count of tasks

2. **Enhance TodoContext**:
   - Implement state management for tracking loaded date ranges
   - Add functionality to load tasks for specific date ranges
   - Implement a mechanism to detect when more tasks need to be loaded

3. **Update TaskListContainer**:
   - Modify the component to request tasks for the visible date range
   - Implement "load more" functionality for historical tasks
   - Add visual indicators when more tasks are available

4. **Backend Optimizations**:
   - Add an endpoint to get task counts by date range
   - Optimize the task retrieval query for date-based filtering

## Detailed Implementation Steps

### 1. Frontend API Service Updates

Update `todoApi.ts` to support pagination and date filtering:

```typescript
async fetchTasks(options?: { 
  status?: string, 
  skip?: number, 
  take?: number,
  startDate?: string,
  endDate?: string
}): Promise<Task[]> {
  const queryParams = options ? new URLSearchParams(
    Object.entries(options)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  ).toString() : '';
  
  const url = `/api/tasks${queryParams ? `?${queryParams}` : ''}`;
  const response = await api.get<Task[]>(url);
  return response.data;
}

async getTaskCount(options?: { 
  status?: string,
  startDate?: string,
  endDate?: string
}): Promise<number> {
  const queryParams = options ? new URLSearchParams(
    Object.entries(options)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  ).toString() : '';
  
  const url = `/api/tasks/count${queryParams ? `?${queryParams}` : ''}`;
  const response = await api.get<{ count: number }>(url);
  return response.data.count;
}
```

### 2. TodoContext Enhancements

Modify `TodoContext.tsx` to handle progressive loading:

```typescript
// Add to state
const [loadedDateRanges, setLoadedDateRanges] = useState<Array<{start: string, end: string}>>([]);
const [hasMorePastTasks, setHasMorePastTasks] = useState<boolean>(true);
const [hasMoreFutureTasks, setHasMoreFutureTasks] = useState<boolean>(true);
const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

// Replace fetchTasks with this implementation
const fetchTasksForDateRange = useCallback(async (startDate: Date, endDate: Date, append: boolean = false) => {
  if (append) {
    setIsLoadingMore(true);
  } else {
    dispatch({ type: 'LOADING' });
  }
  
  try {
    const formattedStartDate = toDateStringPT(startDate);
    const formattedEndDate = toDateStringPT(endDate);
    
    const tasks = await todoApi.fetchTasks({
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      take: 500 // Increased limit for date range
    });
    
    if (append) {
      dispatch({ type: 'APPEND_TASKS', tasks });
    } else {
      dispatch({ type: 'FETCH_SUCCESS', tasks });
    }
    
    // Update loaded date ranges
    setLoadedDateRanges(prev => {
      const newRange = { start: formattedStartDate, end: formattedEndDate };
      return [...prev.filter(range => 
        !(range.start >= formattedStartDate && range.end <= formattedEndDate)
      ), newRange];
    });
    
    // Check if we have more tasks in either direction
    const pastCount = await todoApi.getTaskCount({
      endDate: new Date(startDate.getTime() - 86400000).toISOString().split('T')[0]
    });
    
    const futureCount = await todoApi.getTaskCount({
      startDate: new Date(endDate.getTime() + 86400000).toISOString().split('T')[0]
    });
    
    setHasMorePastTasks(pastCount > 0);
    setHasMoreFutureTasks(futureCount > 0);
  } catch (error: any) {
    dispatch({ type: 'FETCH_ERROR', error: error.message || 'Failed to fetch tasks' });
  } finally {
    setIsLoadingMore(false);
  }
}, []);

// Add methods to load more tasks
const loadMorePastTasks = useCallback(async (days: number = 30) => {
  if (!hasMorePastTasks || isLoadingMore) return;
  
  // Find earliest loaded date
  const earliestRange = loadedDateRanges.reduce((earliest, range) => 
    range.start < earliest ? range.start : earliest, 
    loadedDateRanges[0]?.start || toDateStringPT(new Date())
  );
  
  const earliestDate = new Date(earliestRange);
  const newStartDate = new Date(earliestDate);
  newStartDate.setDate(newStartDate.getDate() - days);
  
  await fetchTasksForDateRange(newStartDate, new Date(earliestDate.getTime() - 86400000), true);
}, [hasMorePastTasks, isLoadingMore, loadedDateRanges, fetchTasksForDateRange]);

const loadMoreFutureTasks = useCallback(async (days: number = 30) => {
  if (!hasMoreFutureTasks || isLoadingMore) return;
  
  // Find latest loaded date
  const latestRange = loadedDateRanges.reduce((latest, range) => 
    range.end > latest ? range.end : latest, 
    loadedDateRanges[0]?.end || toDateStringPT(new Date())
  );
  
  const latestDate = new Date(latestRange);
  const newEndDate = new Date(latestDate);
  newEndDate.setDate(newEndDate.getDate() + days);
  
  await fetchTasksForDateRange(new Date(latestDate.getTime() + 86400000), newEndDate, true);
}, [hasMoreFutureTasks, isLoadingMore, loadedDateRanges, fetchTasksForDateRange]);
```

### 3. TaskListContainer Updates

Modify `TaskListContainer.tsx` to work with the enhanced TodoContext:

```typescript
// Add to the destructured context values
const {
  // ... existing values
  loadMorePastTasks,
  loadMoreFutureTasks,
  hasMorePastTasks,
  hasMoreFutureTasks,
  isLoadingMore
} = useTodo();

// Update the useEffect that loads tasks on mount
useEffect(() => {
  // Calculate initial date range (e.g., 3 months back, 3 months forward)
  const today = createPTDate(new Date());
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - 90); // 3 months back
  
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 90); // 3 months forward
  
  fetchTasksForDateRange(pastDate, futureDate);
}, [fetchTasksForDateRange]);

// Add UI elements for loading more tasks
return (
  <div className={styles.taskListContainer}>
    {hasMorePastTasks && (
      <div 
        className={styles.loadMoreButton} 
        onClick={() => loadMorePastTasks()}
        disabled={isLoadingMore}
      >
        {isLoadingMore ? 'Loading...' : 'Load earlier tasks'}
      </div>
    )}
    
    {/* Existing day containers */}
    {dateArray.map((date, index) => {
      // ... existing code
    })}
    
    {hasMoreFutureTasks && (
      <div 
        className={styles.loadMoreButton} 
        onClick={() => loadMoreFutureTasks()}
        disabled={isLoadingMore}
      >
        {isLoadingMore ? 'Loading...' : 'Load more future tasks'}
      </div>
    )}
  </div>
);
```

### 4. Backend Enhancements

Add a new endpoint to get task counts in `backend/src/routes/tasks.ts`:

```typescript
// Get task count
const getTaskCount: RequestHandler = async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const startDate = req.query.startDate ? createPTDate(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? createPTDate(req.query.endDate as string) : undefined;
    
    const count = await TaskService.getTaskCount(req.user!.id, { status, startDate, endDate });
    res.json({ count });
  } catch (error: unknown) {
    console.error('Get task count error:', error);
    res.status(500).json({ error: 'Failed to fetch task count' });
  }
};

// Add to routes
router.get('/count', getTaskCount);
```

Add the corresponding method to `TaskService`:

```typescript
/**
 * Get task count for a user with optional filters
 */
static async getTaskCount(userId: string, options?: {
  status?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<number> {
  const whereClause: Prisma.TaskWhereInput = { userId };
  
  if (options?.status) {
    whereClause.status = options.status;
  }
  
  if (options?.startDate || options?.endDate) {
    whereClause.dueDate = {};
    
    if (options?.startDate) {
      whereClause.dueDate.gte = options.startDate;
    }
    
    if (options?.endDate) {
      whereClause.dueDate.lte = options.endDate;
    }
  }
  
  return this.prisma.task.count({ where: whereClause });
}
```

## Benefits of This Approach

1. **Performance**: Only loads tasks for relevant date ranges, reducing initial load time
2. **Scalability**: Works well for users with hundreds or thousands of tasks
3. **User Experience**: Maintains the current UI while adding progressive loading
4. **Resource Efficiency**: Reduces server load by fetching only what's needed
5. **Flexibility**: Can be adjusted based on user behavior patterns

## Implementation Considerations

1. **Cache Management**: Implement proper cache invalidation when tasks are modified
2. **Error Handling**: Add robust error handling for failed requests
3. **Loading States**: Provide clear visual feedback during loading operations
4. **Testing**: Test with large datasets to ensure performance
5. **Analytics**: Consider adding analytics to understand how users interact with tasks over time

## Alternative Approaches Considered

### 1. Simple Pagination

We could implement traditional pagination with "previous/next" buttons, but this wouldn't work well with the date-based UI of the task list.

### 2. Infinite Scrolling

Pure infinite scrolling could work but might lead to performance issues as the DOM grows with a large number of tasks.

### 3. Virtual Scrolling

A virtual scrolling approach would be more complex to implement with the current date-based grouping UI.

### 4. Increased Backend Limit

Simply increasing the backend limit would be a temporary solution but wouldn't scale well for users with very large task collections.

## Conclusion

The progressive loading strategy with date-based filtering provides the best balance of performance, user experience, and scalability for handling users with more than 100 tasks. It builds on the existing UI paradigm while adding the necessary functionality to handle large task collections efficiently.