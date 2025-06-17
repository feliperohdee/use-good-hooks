# 🪝 use-good-hooks

![React](https://img.shields.io/badge/React-19.0.0+-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2.0+-646CFF?style=flat-square&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
[![Vitest](https://img.shields.io/badge/-Vitest-729B1B?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)

A collection of well-tested, performance-optimized React hooks for common web application patterns. These hooks help manage state, UI interactions, and browser features with clean, reusable abstractions.

## 📦 Installation

```bash
# Using npm
npm install use-good-hooks

# Using yarn
yarn add use-good-hooks

# Using pnpm
pnpm add use-good-hooks
```

## 🔌 Requirements

- React 19.0.0+
- Lodash 4.17.21+

## 🧰 Available Hooks

### `useDebounce`

Debounces value changes to prevent rapid updates. Useful for search inputs, form validation, and other scenarios where you want to delay state updates until after a user has stopped changing the input.

```typescript
import useDebounce from 'use-good-hooks/use-debounce';

const SearchComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms delay

  // API call will only happen 500ms after the user stops typing
  useEffect(() => {
    if (debouncedSearchTerm) {
      searchAPI(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
};
```

#### Parameters

- `value`: The value to debounce
- `delay`: (Optional) The delay in milliseconds (default: 300ms)

#### Returns

- The debounced value

### `useDebounceFn`

Creates a debounced version of a function. This hook ensures that a function is only executed after a specified period of inactivity, preventing it from being called too frequently. It's ideal for handling events like button clicks or API triggers that should not fire on every user action.

```typescript
import useDebounceFn from 'use-good-hooks/use-debounce-fn';

const SaveButton = () => {
  const [status, setStatus] = useState('Idle');

  const debouncedSave = useDebounceFn(() => {
    setStatus('Saving...');
    // Simulate API call
    setTimeout(() => setStatus('Saved!'), 1000);
  }, 1000); // 1000ms delay

  const handleClick = () => {
    setStatus('Waiting...');
    debouncedSave();
  };

  return (
    <div>
      <button onClick={handleClick}>Save Changes</button>
      <p>Status: {status}</p>
    </div>
  );
};
```

#### Parameters

- `fn`: The function to debounce
- `delay`: (Optional) The delay in milliseconds (default: 300ms)

#### Returns

- The debounced function.

### `useThrottle`

Limits the rate at which a value can update. Useful for scroll events, window resizing, and other high-frequency events.

```typescript
import useThrottle from 'use-good-hooks/use-throttle';

const ScrollTracker = () => {
  const [scrollY, setScrollY] = useState(0);
  const throttledScrollY = useThrottle(scrollY, 200); // 200ms throttle

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return <div>Throttled scroll position: {throttledScrollY}px</div>;
};
```

#### Parameters

- `value`: The value to throttle
- `delay`: (Optional) The throttle interval in milliseconds (default: 300ms)

#### Returns

- The throttled value

### `useThrottleFn`

Creates a throttled version of a function, limiting its execution to at most once per specified interval. It is useful for performance-critical scenarios like handling mouse movements, scrolling, or window resizing events without overwhelming the browser.

```typescript
import useThrottleFn from 'use-good-hooks/use-throttle-fn';

const MouseTracker = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const throttledMouseMove = useThrottleFn((event) => {
    setPosition({ x: event.clientX, y: event.clientY });
  }, 300); // Update at most every 300ms

  useEffect(() => {
    window.addEventListener('mousemove', throttledMouseMove);
    return () => window.removeEventListener('mousemove', throttledMouseMove);
  }, [throttledMouseMove]);

  return (
    <div>
      Throttled mouse position: X: {position.x}, Y: {position.y}
    </div>
  );
};
```

#### Parameters

- `fn`: The function to throttle
- `delay`: (Optional) The throttle interval in milliseconds (default: 300ms)

#### Returns

- The throttled function.

### `usePrev`

Captures the previous value of a state or prop. Useful for comparing changes between renders.

```typescript
import usePrev from 'use-good-hooks/use-prev';

const Counter = ({ count }) => {
  const prevCount = usePrev(count);

  return (
    <div>
      <p>Current count: {count}</p>
      <p>Previous count: {prevCount ?? 'None'}</p>
      <p>Direction: {count > prevCount ? 'Increasing' : count < prevCount ? 'Decreasing' : 'No change'}</p>
    </div>
  );
};
```

#### Parameters

- `value`: The value to track

#### Returns

- The previous value (undefined on first render)

### `useHistoryState`

Tracks the history of a state value, providing undo and redo capabilities. This is perfect for building editors, forms, or any UI where users might want to reverse their actions.

```typescript
import useHistoryState from 'use-good-hooks/use-history-state';

const TextEditor = () => {
  const {
    canRedo,
    canUndo,
    history,
    redo,
    setState,
    state,
    undo
  } = useHistoryState('', { capacity: 10 });

  return (
    <div>
      <textarea
        value={state}
        onChange={(e) => setState(e.target.value)}
        rows={4}
        cols={50}
      />
      <div>
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
      </div>
      <p>History (last {history.length} changes):</p>
      <pre>{JSON.stringify(history, null, 2)}</pre>
    </div>
  );
};
```

#### Parameters

- `initialState`: The initial state value
- `options`: (Optional) Configuration options:
    - `capacity`: Maximum number of history entries to keep (default: 10)

#### Returns

- Object with:
    - `canRedo`: Boolean indicating if redo is possible
    - `canUndo`: Boolean indicating if undo is possible
    - `history`: Array of all recorded states
    - `redo`: Function to move to the next state (redo)
    - `set`: Function to update the state and record history
    - `state`: The current state value
    - `undo`: Function to move to the previous state (undo)

### `useDistinct`

Detects distinct changes in values with support for deep comparison and custom equality checks. Useful for tracking whether complex objects have actually changed.

```typescript
import useDistinct from 'use-good-hooks/use-distinct';

const UserProfileForm = ({ user }) => {
  const { distinct, value, prevValue } = useDistinct(user, { deep: true });

  useEffect(() => {
    if (distinct) {
      console.log('User data changed from:', prevValue, 'to:', value);
      // Perhaps save to backend or update UI
    }
  }, [distinct, prevValue, value]);

  return (
    <div>
      <h2>Editing profile for: {user.name}</h2>
      {distinct && <div className="alert">Unsaved changes!</div>}
      {/* Form inputs */}
    </div>
  );
};
```

#### Parameters

- `inputValue`: The value to check for changes
- `options`: (Optional) Configuration options:
    - `deep`: Boolean to enable deep equality comparison (default: false)
    - `compare`: Custom comparison function (a, b) => boolean
    - `debounce`: Debounce time in milliseconds (default: 0)

#### Returns

- Object with:
    - `distinct`: Boolean indicating if the value changed
    - `prevValue`: The previous distinct value
    - `value`: The current value

### `useStorageState`

Persists state to localStorage or sessionStorage with automatic serialization/deserialization.

```typescript
import useStorageState from 'use-good-hooks/use-storage-state';

const ThemePreferences = () => {
  const [preferences, setPreferences, { removeKey }] = useStorageState('theme-prefs', {
    darkMode: false,
    fontSize: 'medium',
    compactView: true
  });

  return (
    <div>
      <h2>Theme Settings</h2>
      <label>
        <input
          type="checkbox"
          checked={preferences.darkMode}
          onChange={() => setPreferences({...preferences, darkMode: !preferences.darkMode})}
        />
        Dark Mode
      </label>
      {/* More settings */}
      <button onClick={removeKey}>Reset to Defaults</button>
    </div>
  );
};
```

#### Parameters

- `key`: Storage key name
- `initialState`: Default state if no stored value exists
- `options`: (Optional) Configuration options:
    - `storage`: 'local' or 'session' (default: 'local')
    - `debounce`: Debounce time in milliseconds (default: 500)
    - `onError`: Error callback function
    - `omitKeys`: Array of keys to omit from storage or function (value, key) => boolean
    - `pickKeys`: Array of keys to include in storage or function (value, key) => boolean

#### Returns

- Array with:
    - State value
    - State setter function
    - Object with utility functions:
        - `removeKey`: Function to clear the storage key

### `useUrlState`

Synchronizes state with URL query parameters. Great for shareable UI states, filters, pagination, and search terms.

```typescript
import useUrlState from 'use-good-hooks/use-url-state';

const ProductFilter = () => {
  const [filters, setFilters] = useUrlState({
    category: '',
    minPrice: 0,
    maxPrice: 1000,
    sortBy: 'newest'
  }, {
    url: new URL(window.location.href),
    kebabCase: true,
    omitValues: ['', 0]
  });

  return (
    <div>
      <select
        value={filters.category}
        onChange={(e) => setFilters({...filters, category: e.target.value})}
      >
        <option value="">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>
      {/* More filter controls */}
    </div>
  );
};
```

#### Parameters

- `initialState`: Default state if URL has no parameters
- `options`: Configuration options:
    - `url`: URL object to use (required)
    - `debounce`: Debounce time in milliseconds (default: 500)
    - `kebabCase`: Convert camelCase keys to kebab-case in URL (default: true)
    - `prefix`: Optional prefix for URL parameters
    - `onError`: Error callback function
    - `omitKeys`: Array of keys to omit from URL or function (value, key) => boolean
    - `pickKeys`: Array of keys to include in URL or function (value, key) => boolean
    - `omitValues`: Array of values to omit from URL or function (value, key) => boolean

#### Returns

- Array with:
    - State value
    - State setter function

### `useGlobalState` and `createGlobalState`

Creates and manages global state that can be shared across components with automatic synchronization.

```typescript
import { createGlobalState, useGlobalState } from 'use-good-hooks/use-global-state';

// Create a global state instance (typically in a separate file)
const counterState = createGlobalState({ count: 0 });

// Component A
const CounterDisplay = () => {
  const [counter, setCounter] = useGlobalState(counterState);

  return (
    <div>
      <p>Count: {counter.count}</p>
      <button onClick={() => setCounter({ count: counter.count + 1 })}>
        Increment
      </button>
    </div>
  );
};

// Component B (in a different part of your app)
const CounterActions = () => {
  const [counter, setCounter] = useGlobalState(counterState);

  return (
    <div>
      <button onClick={() => setCounter({ count: 0 })}>
        Reset Count
      </button>
      <button onClick={() => setCounter(prev => ({ count: prev.count + 5 }))}>
        Add 5
      </button>
    </div>
  );
};
```

#### Usage

1. First, create a global state store:

```typescript
// state/counter.ts
import { createGlobalState } from 'use-good-hooks/use-global-state';

export const counterState = createGlobalState({ count: 0 });
```

2. Then use it in any component:

```typescript
import { useGlobalState } from 'use-good-hooks/use-global-state';
import { counterState } from './state/counter';

const MyComponent = () => {
	const [counter, setCounter] = useGlobalState(counterState);
	// ...
};
```

#### `createGlobalState` Parameters

- `initialState`: The initial state value

#### `createGlobalState` Returns

- Array with:
    - `state`: The current state
    - `setState`: Function to update state
    - `store`: Object with utility methods:
        - `getState()`: Function to get current state
        - `subscribe(callback)`: Subscribe to state changes
        - `resetState()`: Reset to initial state

#### `useGlobalState` Parameters

- `globalState`: The global state created with `createGlobalState`

#### `useGlobalState` Returns

- Array with:
    - `state`: The component's local copy of the state
    - `setState`: Function to update global state (accepts new value or update function)

### `useTemporaryState`

Creates a temporary state that resets after a specified timeout.

```typescript
import useTemporaryState from 'use-good-hooks/use-temporary-state';

const [state, setState] = useTemporaryState('initial', 1000);

// State will reset to 'initial' after 1 second
```

#### Parameters

- `initialState`: The initial state value
- `timeout`: The timeout duration in milliseconds (default: 3000)

#### Returns

- Array with:
    - `state`: The current state
    - `setState`: Function to update state

## 🧪 Running Tests

This library is thoroughly tested with Vitest and React Testing Library. To run the tests:

```bash
# Using npm
npm test

# Using yarn
yarn test

# Using pnpm
pnpm test
```

## 🔄 How hooks update and optimize performance

Each hook in this library is designed with performance in mind:

1. `useDebounce` and `useThrottle` reduce unnecessary renders using Lodash's optimized implementations
2. `useDistinct` avoids reference equality problems with optional deep comparison
3. `useStorageState` batches storage updates to reduce expensive serialization/deserialization
4. `useUrlState` efficiently handles URL synchronization with debouncing
5. `useGlobalState` and `createGlobalState` provide a way to share state across components with automatic synchronization
6. `useTemporaryState` allows for temporary state that resets after a timeout

## 🛠️ Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Run tests
yarn test

# Build the library
yarn build

# Lint and format the code
yarn lint
```

## 🙏 Acknowledgements

This project was built with:

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Vitest](https://vitest.dev/)
- [Lodash](https://lodash.com/)
- [use-json](https://www.npmjs.com/package/use-json)
- [use-qs](https://www.npmjs.com/package/use-qs)

## 📝 License

MIT © [Felipe Rohde](mailto:feliperohdee@gmail.com)

## 👨‍💻 Author

**Felipe Rohde**

- Twitter: [@felipe_rohde](https://twitter.com/felipe_rohde)
- Github: [@feliperohdee](https://github.com/feliperohdee)
- Email: feliperohdee@gmail.com
