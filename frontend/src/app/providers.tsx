'use client';

import { SWRConfig } from 'swr';
import axios from 'axios';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig 
      value={{
        fetcher: (url: string) => axios.get(url).then(res => res.data),
        revalidateOnFocus: false,
        revalidateIfStale: false
      }}
    >
      {children}
    </SWRConfig>
  );
}