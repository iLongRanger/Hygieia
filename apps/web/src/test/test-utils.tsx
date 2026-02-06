import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a new QueryClient for each test to avoid state leakage
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  queryClient?: QueryClient;
}

function AllTheProviders({ children, queryClient }: { children: React.ReactNode; queryClient?: QueryClient }) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const { initialRoute = '/', queryClient, ...renderOptions } = options || {};

  if (initialRoute) {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  return render(ui, {
    wrapper: ({ children }) => <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>,
    ...renderOptions,
  });
}

export * from '@testing-library/react';
export { customRender as render, createTestQueryClient };
