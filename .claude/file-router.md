# File Router

I want to build a `vite` plugin that will dynamically generate routing config object that can be passed into `react-router`'s `createBrowserRouter()`. that's based off of the file hierarchy, so that the file structure defines the app's routing and layout organization. That way, the file structure becomes the single source of truth instead of having to maintain a separate routes file which could drift.

The plugin is only meant to generate `routes.jsx`, and nothing more.

The `vite` plugin will eventually be bundled into its own package: `@travistrue2008/vite-react-file-router`, but not on the first iteration. This project is currently set up as a React app, so let's just add the pluging source into its own directory: `src/plugin` for now. Once we get the basic stuff up and running, we'll refactor the project to have a top-level `/tests` directory which will include integration tests. Each integration test suite gets its own directory with a single `integration.test.tsx` inside of it where each test suite gets its own `vite`-powered React app with the plugin installed and configured.

## Plugin Interface

Ideally, I'd like the `vite` plugin to be able to have the following config options:
- `inputPath`:
  - Default: `src/components/app`
  - Value: relative path to project root
  - Description: this is path to where the root route components path that'll be used to generate the `routes.{jsx}` file from.
- `outputPath`:
  - Default: `src/routes.{jsx}`
  - Value: relative path to project root
  - Description: where to output the

The plugin should watch the `inputPath` for any file/directory changes, and update the routes file accordingly.

## Directory Mapping

The React app's `src/components/app` directory would be the entry point, and any sub-directories defined there will generate the routes that can exist in the application.

Here are some examples on how the file structure maps to possible routes:
| Path          | URL Route                              |
|-------------------------------------|---------------------------------------------|
| `src/components/app`                | `/` (root route)                            |
| `src/components/app/users`          | `/users`                                    |
| `src/components/app/users/:userId`  | `/users/123`                                |

Notes
- Only directories define route segemnts; not files themselves
- The `/:userId` directory is a dynamic route param. Directories that start with a colon (`:`) are dynamic route params

## Page Component Resolution

All sub-directories can also have a `Page.{jsx|tsx}` that get rendered if their sub-directory matches that route. When file directory is matched to the current route, the `default` exported component found in that directory's `Page.{jsx|tsx}` is rendered.

For example:

| Route         | Renders Component at Path                   |
|---------------|---------------------------------------------|
| `/`           | `src/component/app/Page.tsx`                |
| `/users`      | `src/component/app/users/Page.tsx`          |
| `/users/123`  | `src/component/app/users/:userId/Page.tsx`  |

### Default Exports

All `Page.{jsx|tsx}` files that are defined with any directory/sub-directory within `src/components/app` **must** define a `default` export, and it must be a React component. The `vite` plugin will validate that all `Page.{jsx|tsx}` components have a `default` export that is a valid React component at the beginning of execution, and throw an error if either of these requirements aren't met. The error will contain the path to the `Page.{jsx|tsx}` file.

The message also changes depending on the missed requirement:
- Missing file: `[Error] <DIR_PATH>: Page.{jsx|tsx} not found`
- Missing default export: `[Error] <FILE_PATH>`: has no `default` export
- `default` export not React component: `[Error] <FILE_PATH>_: `default` export is not a valid React component

### Leaf-Most Directory Requirements

Additionally, the `vite` plugin expects a `Page.{jsx|tsx}` file in all directories within `src/components/app` that don't contain any sub-directories. The `vite` plugin should validate for this requirement at the very beginning, and immediately throw an error in the console if a directory that doesn't contain any sub-directories doesn't contain a `Page.{jsx|tsx}`.

Here's an example of a directory structure that should throw an error:

```
+ /app
    + /photos
        - Page.tsx
    + /users
        + /:userId
```

- `/app` doesn't require `Page.{jsx|tsx}` inside of it because it has sub-directories: `/users` and `/photos`, therefore it doesn't cause an error
- `/app/photos` requires `Page.{jsx|tsx}` since it also doesn't contain any sub-directories, but it fulfills that requirement by having `Page.{jsx|tsx}`
- `/app/users/:userId` causes an error because it doesn't have any sub-directories, or `Page.{jsx|tsx}` in it

### Handling 404 Cases

If the browser navigates to a route that maps to a valid directory with no `Page.{jsx|tsx}` inside of it, then the app attempts to render the `default` export from `src/components/app/404.{jsx|tsx}`, if it exists. If the app doesn't define `src/components/app/404.{jsx|tsx}`, then the `vite` plugin will provide its own default `404` component.

So, if the current app URI is: `/users/123` then the router will render `src/components/app/users/:userId/Page.{jsx|tsx}` if it exists, and it'd render it inside of any matched `Layout` components that may exist.

The `vite` plugin will come with its own `404.jsx`

## Layout Component Resolution

Route directories (and their descendents) can contain an optional `Layout.{jsx|tsx}` file that exports a default component which is rendered if that sub-directory's segment is matched for the app's current route. The `Layout` component also needs to define an `<Outlet />` component within their JSX templating, so the matching `Page` component, and subsequent matching sub-directories' `Layout` components can be rendered.

## Generating Code

Here are some specs on how to generate code:

- Should import the the application's own `404.{jsx|tsx}` if that file exists in the `inputPath`
- The default component's import name should be generated based off of the relative path
  - Directory names can be in either `snake_case`, `kabab-case` `camelCase`, or `PascalCase`
  - Convert each directory name into `PascalCase`
  - Replace the path's slashes with underscores (`_`)
  - Directories representing dynamic route params replace their starting with a colon (`:`) with an underscore (`_`)
- Import the `Layout` before the `Page` for directories that contain both

Here's a block of code containing multiple examples:

```tsx
import Page from 'Page'
import Users_Page from 'users/Page'
import Users__UserId_Page from 'users/:userId/Page'
import Blog_LastWeek from 'blog/last_week'
import Blog_LastWeek from 'blog/last-week'
import Blog_LastWeek from 'blog/lastWeek'
import Blog_LastWeek from 'blog/LastWeek'
import Blog__LastWeek from 'blog/:last_week'
import Blog__LastWeek from 'blog/:last-week'
import Blog__LastWeek from 'blog/:lastWeek'
import Blog__LastWeek from 'blog/:LastWeek'
```

## Generation Use-Cases

This section is a set of scenarios that describe what the output routes config for the files that exist. All following paths are relative to the default `inputPath`.

### Empty App Route Directory

Files:

- `/`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### User-Defined 404 Component

Files:

- `/404.tsx`

Config:
```jsx
import NotFoundPage from 'src/components/app/404.tsx'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Root (Page-Only)

Files:

- `/Page.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Page from 'src/components/app/Page.tsx'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        index: true,
        element: <Page />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Root (Layout-Only)

Files:

- `/Layout.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Layout from 'src/components/app/Layout.tsx'

export default createBrowserRouter([
  {
    path: '/',
    element: <Layout />
    children: [
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Root (Page and Layout)

Files:

- `/Layout.tsx`
- `/Page.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Layout from 'src/components/app/Layout.tsx'
import Page from 'src/components/app/Page.tsx'

export default createBrowserRouter([
  {
    path: '/',
    element: <Layout />
    children: [
      {
        index: true,
        element: <Page />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Sub-Route (Page-Only)

Files:

- `/users/Page.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Users_Page from 'src/components/app/users/Page.tsx'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        path: 'users',
        children: [
          {
            index: true,
            element: <Users_Page />,
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Sub-Route (Layout-Only)

Files:

- `/users/Layout.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Users_Layout from 'src/components/app/users/Layout.tsx'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        path: 'users',
        element: <Users_Layout />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Sub-Route (Page and Layout)

Files:

- `/users/Layout.tsx`
- `/users/Page.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Users_Layout from 'src/components/app/users/Layout.tsx'
import Users_Page from 'src/components/app/users/Page.tsx'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        path: 'users',
        element: <Users_Layout />,
        children: [
          {
            index: true,
            element: <Users_Page />,
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Sub-Route (Page and Layout with Root)

Files:

- `/Page.tsx`
- `/users/Layout.tsx`
- `/users/Page.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Users_Layout from 'src/components/app/users/Layout.tsx'
import Users_Page from 'src/components/app/users/Page.tsx'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        index: true,
        element: <Page />,
      },
      {
        path: 'users',
        element: <Users_Layout />,
        children: [
          {
            index: true,
            element: <Users_Page />,
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Nested Route (Page-Only)

Files:

- `/users/:users/Page.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Users__UserId_Page from 'src/components/app/users/:users/Page.tsx'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        path: 'users',
        children: [
          {
            path: ':users',
            children: [
              {
                index: true,
                element: <Users__UserId_Page />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Nested Route (Layout-Only)

Files:

- `/users/:users/Layout.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Users__UserId_Layout from 'src/components/app/users/:users/Layout.tsx'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        path: 'users',
        children: [
          {
            path: ':userId',
            element: <Users__UserId_Layout />,
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Nested Route (Page and Layout)

Files:

- `/users/:users/Layout.tsx`
- `/users/:users/Page.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Users__UserId_Layout from 'src/components/app/users/:users/Layout.tsx'
import Users__UserId_Page from 'src/components/app/users/:users/Page.tsx'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        path: 'users',
        children: [
          {
            path: ':users',
            element: <Users__UserId_Layout />,
            children: [
              {
                index: true,
                element: <Users__UserId_Page />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Nested Route (Page and Layout with Parent Route)

Files:

- `/users/Page.tsx`
- `/users/:users/Layout.tsx`
- `/users/:users/Page.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Users_Page from 'src/components/app/users/Page.tsx'
import Users__UserId_Layout from 'src/components/app/users/:users/Layout.tsx'
import Users__UserId_Page from 'src/components/app/users/:users/Page.tsx'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        path: 'users',
        children: [
          {
            index: true,
            element: <Users_Page />,
          },
          {
            path: ':userId',
            element: <Users__UserId_Layout />,
            children: [
              {
                index: true,
                element: <Users__UserId_Page />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Nested Route (Page and Layout with Parent Route and Root)

Files:

- `/Page.tsx`
- `/users/Page.tsx`
- `/users/:users/Layout.tsx`
- `/users/:users/Page.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Page from 'src/components/app/Page.tsx'
import Users_Page from 'src/components/app/users/Page.tsx'
import Users__UserId_Layout from 'src/components/app/users/:users/Layout.tsx'
import Users__UserId_Page from 'src/components/app/users/:users/Page.tsx'

export default createBrowserRouter([
  {
    path: '/',
    children: [
      {
        index: true,
        element: <Page />,
      },
      {
        path: 'users',
        children: [
          {
            index: true,
            element: <Users_Page />,
          },
          {
            path: ':userId',
            element: <Users__UserId_Layout />,
            children: [
              {
                index: true,
                element: <Users__UserId_Page />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

### Full Example

Files:

- `/Layout.tsx`
- `/Page.tsx`
- `/users/Layout.tsx`
- `/users/Page.tsx`
- `/users/:users/Layout.tsx`
- `/users/:users/Page.tsx`

Config:
```jsx
import NotFoundPage from '@src/plugin/404'
import Layout from 'src/components/app/Layout.tsx'
import Page from 'src/components/app/Page.tsx'
import Users_Layout from 'src/components/app/users/Layout.tsx'
import Users_Page from 'src/components/app/users/Page.tsx'
import Users__UserId_Layout from 'src/components/app/users/:users/Layout.tsx'
import Users__UserId_Page from 'src/components/app/users/:users/Page.tsx'

export default createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Page />,
      },
      {
        path: 'users',
        element: <Users_Layout />,
        children: [
          {
            index: true,
            element: <Users_Page />,
          },
          {
            path: ':userId',
            element: <Users__UserId_Layout />,
            children: [
              {
                index: true,
                element: <Users__UserId_Page />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
```

## Questions

- Does the `vite` plugin need to actively watch the `inputPath`, or will `vite` automatically re-run all plugins during HMR/reloads?
- Not sure which test runner to use for running integration tests. I'd prefer `bun`'s own built-in test runner if possible, but I'm ok with going with Playwright or Cypress.
